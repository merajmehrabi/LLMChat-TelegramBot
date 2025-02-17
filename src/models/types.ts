import { Document, Model } from 'mongoose';
import { ModelId } from '../config/openrouter.config';

// Message Types
export interface IMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  model: ModelId;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
}

// User Types
export interface IUser {
  telegramId: number;
  username: string;
  isAdmin: boolean;
  isWhitelisted: boolean;
  preferences: {
    defaultModel: ModelId;
    notifications: boolean;
  };
  createdAt: Date;
  lastActive: Date;
}

export interface UserDocument extends Omit<Document, 'model'>, IUser {
  hasAccess(): boolean;
  updatePreferences(preferences: Partial<IUser['preferences']>): Promise<UserDocument>;
}

export interface UserModel extends Model<UserDocument> {
  findByTelegramId(telegramId: number): Promise<UserDocument | null>;
  getWhitelistedUsers(): Promise<UserDocument[]>;
  getAdminUsers(): Promise<UserDocument[]>;
  updateLastActive(telegramId: number): Promise<UserDocument | null>;
}

// Conversation Types
export interface IConversation {
  userId: Document['_id'];
  title?: string;
  messages: IMessage[];
  model: ModelId;
  totalTokens: number;
  totalCost: number;
  createdAt: Date;
  updatedAt: Date;
  lastMessageAt: Date;
}

export interface ConversationDocument extends Omit<Document, 'model'>, IConversation {
  addMessage(message: IMessage): Promise<ConversationDocument>;
  clearHistory(): Promise<ConversationDocument>;
  getContext(limit?: number): IMessage[];
  updateModel(model: ModelId): Promise<ConversationDocument>;
}

export interface ConversationModel extends Model<ConversationDocument> {
  findByUserId(userId: Document['_id']): Promise<ConversationDocument[]>;
  findWithMessages(conversationId: Document['_id']): Promise<ConversationDocument | null>;
  getUserStats(userId: Document['_id']): Promise<{
    totalConversations: number;
    totalMessages: number;
    totalTokens: number;
    totalCost: number;
  }>;
}

// Usage Types
export interface IUsage {
  userId: Document['_id'];
  conversationId: Document['_id'];
  model: ModelId;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost: number;
  timestamp: Date;
}

export interface UsageDocument extends Omit<Document, 'model'>, IUsage {}

export interface UsageModel extends Model<UsageDocument> {
  getUserUsage(userId: Document['_id']): Promise<{
    totalTokens: number;
    totalCost: number;
    modelBreakdown: Record<ModelId, {
      tokens: number;
      cost: number;
    }>;
  }>;
  getGlobalStats(): Promise<{
    totalTokens: number;
    totalCost: number;
    activeUsers: number;
    modelUsage: Record<ModelId, {
      tokens: number;
      cost: number;
      users: number;
    }>;
  }>;
}
