import mongoose, { Schema } from 'mongoose';
import { ConversationDocument, ConversationModel, IMessage } from './types';
import { AVAILABLE_MODELS } from '../config/openrouter.config';

// Message schema
const messageSchema = new Schema({
  role: {
    type: String,
    required: true,
    enum: ['user', 'assistant', 'system']
  } as const,
  content: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  model: {
    type: String,
    required: true,
    enum: Object.keys(AVAILABLE_MODELS),
    default: 'claude-2'
  } as { 
    type: StringConstructor;
    required: true;
    enum: Array<keyof typeof AVAILABLE_MODELS>;
    default: keyof typeof AVAILABLE_MODELS;
  },
  tokens: {
    prompt: { type: Number },
    completion: { type: Number },
    total: { type: Number }
  },
  cost: { type: Number }
});

// Conversation schema
const conversationSchema = new Schema<ConversationDocument, ConversationModel>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    trim: true
  },
  messages: [messageSchema],
  model: {
    type: String,
    required: true,
    enum: Object.keys(AVAILABLE_MODELS),
    default: 'claude-2'
  } as {
    type: StringConstructor;
    required: true;
    enum: Array<keyof typeof AVAILABLE_MODELS>;
    default: keyof typeof AVAILABLE_MODELS;
  },
  totalTokens: {
    type: Number,
    default: 0
  },
  totalCost: {
    type: Number,
    default: 0
  },
  lastMessageAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes
conversationSchema.index({ userId: 1, createdAt: -1 });
conversationSchema.index({ lastMessageAt: -1 });

// Update lastMessageAt and totals on new message
conversationSchema.pre<ConversationDocument>('save', function(next) {
  if (this.isModified('messages')) {
    this.lastMessageAt = new Date();
    
    // Update totals
    this.totalTokens = this.messages.reduce((sum: number, msg: IMessage) => {
      return sum + (msg.tokens?.total || 0);
    }, 0);

    this.totalCost = this.messages.reduce((sum: number, msg: IMessage) => {
      return sum + (msg.cost || 0);
    }, 0);
  }
  next();
});

// Static methods
conversationSchema.statics = {
  // Find user's conversations
  findByUserId: function(userId: mongoose.Types.ObjectId) {
    return this.find({ userId }).sort({ lastMessageAt: -1 });
  },

  // Find conversation with messages
  findWithMessages: function(conversationId: mongoose.Types.ObjectId) {
    return this.findById(conversationId).populate('messages');
  },

  // Get user's conversation stats
  getUserStats: async function(userId: mongoose.Types.ObjectId) {
    const stats = await this.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalConversations: { $sum: 1 },
          totalMessages: { $sum: { $size: '$messages' } },
          totalTokens: { $sum: '$totalTokens' },
          totalCost: { $sum: '$totalCost' }
        }
      }
    ]);
    return stats[0] || {
      totalConversations: 0,
      totalMessages: 0,
      totalTokens: 0,
      totalCost: 0
    };
  }
};

// Instance methods
conversationSchema.methods = {
  // Add message to conversation
  addMessage: function(message: IMessage) {
    this.messages.push(message);
    return this.save();
  },

  // Clear conversation history
  clearHistory: function() {
    this.messages = [];
    this.totalTokens = 0;
    this.totalCost = 0;
    return this.save();
  },

  // Get conversation context (last N messages)
  getContext: function(limit: number = 10) {
    return this.messages.slice(-limit);
  },

  // Update conversation model
  updateModel: function(model: string) {
    this.model = model;
    return this.save();
  }
};

// Create and export model
const Conversation = mongoose.model<ConversationDocument, ConversationModel>('Conversation', conversationSchema);
export default Conversation;
