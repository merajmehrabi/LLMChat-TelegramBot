import mongoose from 'mongoose';
import { Usage, UsageDocument } from '../models';
import { ModelId, AVAILABLE_MODELS } from '../config/openrouter.config';
import { createError } from '../types/errors';
import { logError, logInfo } from '../config/logger.config';
import { formatErrorMessage, ErrorMessages } from '../utils/error.utils';

class UsageService {
  /**
   * Track usage for a conversation
   */
  async trackUsage(
    userId: string,
    conversationId: string,
    model: ModelId,
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    },
    cost: number
  ): Promise<UsageDocument> {
    try {
      const usage = await Usage.create({
        userId: new mongoose.Types.ObjectId(userId),
        conversationId: new mongoose.Types.ObjectId(conversationId),
        model,
        tokens,
        cost,
        timestamp: new Date()
      });

      logInfo('Usage tracked', {
        userId,
        conversationId,
        model,
        tokens,
        cost
      });

      return usage;
    } catch (error) {
      logError('Error tracking usage', { error, userId, conversationId, model });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.USAGE_TRACK, error, { userId, conversationId, model }),
        { error }
      );
    }
  }

  /**
   * Get user's usage statistics
   */
  async getUserUsage(userId: string) {
    try {
      return await Usage.getUserUsage(new mongoose.Types.ObjectId(userId));
    } catch (error) {
      logError('Error getting user usage', { error, userId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.USAGE_STATS, error, { userId }),
        { error }
      );
    }
  }

  /**
   * Get global usage statistics
   */
  async getGlobalStats() {
    try {
      return await Usage.getGlobalStats();
    } catch (error) {
      logError('Error getting global stats', { error });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.USAGE_STATS, error),
        { error }
      );
    }
  }

  /**
   * Calculate estimated cost for tokens
   */
  calculateEstimatedCost(
    model: ModelId,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Cost per 1K tokens for each model
    const defaultCost = { input: 0.0002, output: 0.0002 };
    const costs = Object.fromEntries(
      Object.keys(AVAILABLE_MODELS).map(model => [
        model,
        defaultCost
      ])
    ) as Record<ModelId, { input: number; output: number }>;

    const modelCosts = costs[model];
    return (
      (promptTokens / 1000) * modelCosts.input +
      (completionTokens / 1000) * modelCosts.output
    );
  }

  /**
   * Check if user has exceeded rate limits
   */
  async checkRateLimits(userId: string): Promise<boolean> {
    try {
      // Get user's recent usage (last hour)
      const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentUsage = await Usage.find({
        userId: new mongoose.Types.ObjectId(userId),
        timestamp: { $gte: hourAgo }
      });

      // Calculate total tokens in last hour
      const totalTokens = recentUsage.reduce(
        (sum, usage) => sum + usage.tokens.total,
        0
      );

      // Default hourly limit: 100K tokens
      const hourlyLimit = 100000;
      return totalTokens < hourlyLimit;
    } catch (error) {
      logError('Error checking rate limits', { error, userId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.RATE_CHECK, error, { userId }),
        { error }
      );
    }
  }
}

// Export singleton instance
export const usageService = new UsageService();
export default usageService;
