import mongoose, { Schema } from 'mongoose';
import { UsageDocument, UsageModel } from './types';
import { AVAILABLE_MODELS } from '../config/openrouter.config';

// Usage schema
const usageSchema = new Schema<UsageDocument, UsageModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },
  model: {
    type: String,
    required: true,
    enum: Object.keys(AVAILABLE_MODELS)
  } as const,
  tokens: {
    prompt: { type: Number, required: true },
    completion: { type: Number, required: true },
    total: { type: Number, required: true }
  },
  cost: {
    type: Number,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: false,
  toJSON: {
    transform: (_, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
usageSchema.index({ userId: 1, timestamp: -1 });
usageSchema.index({ model: 1, timestamp: -1 });

// Static methods
usageSchema.statics = {
  // Get user's usage statistics
  getUserUsage: async function(userId: mongoose.Types.ObjectId) {
    const stats = await this.aggregate([
      { $match: { userId } },
      // First group by model to get per-model stats
      {
        $group: {
          _id: '$model',
          tokens: { $sum: '$tokens.total' },
          cost: { $sum: '$cost' }
        }
      },
      // Then reshape into final format
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokens' },
          totalCost: { $sum: '$cost' },
          modelBreakdown: {
            $push: {
              k: '$_id',
              v: {
                tokens: '$tokens',
                cost: '$cost'
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTokens: 1,
          totalCost: 1,
          modelBreakdown: { $arrayToObject: '$modelBreakdown' }
        }
      }
    ]);

    return stats[0] || {
      totalTokens: 0,
      totalCost: 0,
      modelBreakdown: {}
    };
  },

  // Get global usage statistics
  getGlobalStats: async function() {
    const stats = await this.aggregate([
      {
        $group: {
          _id: {
            model: '$model',
            userId: '$userId'
          },
          tokens: { $sum: '$tokens.total' },
          cost: { $sum: '$cost' }
        }
      },
      {
        $group: {
          _id: '$_id.model',
          tokens: { $sum: '$tokens' },
          cost: { $sum: '$cost' },
          users: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          totalTokens: { $sum: '$tokens' },
          totalCost: { $sum: '$cost' },
          activeUsers: { $sum: '$users' },
          modelUsage: {
            $push: {
              k: '$_id',
              v: {
                tokens: '$tokens',
                cost: '$cost',
                users: '$users'
              }
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalTokens: 1,
          totalCost: 1,
          activeUsers: 1,
          modelUsage: { $arrayToObject: '$modelUsage' }
        }
      }
    ]);

    return stats[0] || {
      totalTokens: 0,
      totalCost: 0,
      activeUsers: 0,
      modelUsage: {}
    };
  }
};

// Create and export model
const Usage = mongoose.model<UsageDocument, UsageModel>('Usage', usageSchema);
export default Usage;
