import mongoose, { Schema } from 'mongoose';
import { UserDocument, UserModel, IUser } from './types';
import { AVAILABLE_MODELS } from '../config/openrouter.config';

// User schema
const userSchema = new Schema<UserDocument, UserModel>({
  telegramId: {
    type: Number,
    required: true,
    unique: true,
    index: true
  },
  username: {
    type: String,
    required: true,
    trim: true
  },
  isAdmin: {
    type: Boolean,
    default: false,
    index: true
  },
  isWhitelisted: {
    type: Boolean,
    default: false,
    index: true
  },
  preferences: {
    defaultModel: {
      type: String,
      default: 'claude-2',
      enum: Object.keys(AVAILABLE_MODELS)
    },
    notifications: {
      type: Boolean,
      default: true
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActive: {
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
userSchema.index({ createdAt: 1 });
userSchema.index({ lastActive: 1 });

// Update lastActive timestamp
userSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastActive = new Date();
  }
  next();
});

// Static methods
userSchema.statics = {
  // Find user by Telegram ID
  findByTelegramId: function(telegramId: number) {
    return this.findOne({ telegramId });
  },

  // Get all whitelisted users
  getWhitelistedUsers: function() {
    return this.find({ isWhitelisted: true });
  },

  // Get all admin users
  getAdminUsers: function() {
    return this.find({ isAdmin: true });
  },

  // Update user's last active timestamp
  updateLastActive: function(telegramId: number) {
    return this.findOneAndUpdate(
      { telegramId },
      { lastActive: new Date() },
      { new: true }
    );
  }
};

// Instance methods
userSchema.methods = {
  // Check if user has access
  hasAccess: function(): boolean {
    return this.isWhitelisted || this.isAdmin;
  },

  // Update user preferences
  updatePreferences: function(preferences: Partial<IUser['preferences']>) {
    Object.assign(this.preferences, preferences);
    return this.save();
  }
};

// Create and export model
const User = mongoose.model<UserDocument, UserModel>('User', userSchema);
export default User;
