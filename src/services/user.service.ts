import { User } from '../models';
import { UserDocument } from '../models/types';
import { ModelId } from '../config/openrouter.config';
import { createError } from '../types/errors';
import { logError, logInfo } from '../config/logger.config';
import { formatErrorMessage, ErrorMessages } from '../utils/error.utils';
import env from '../config/env.config';

class UserService {
  /**
   * Find or create a user from Telegram data
   */
  async findOrCreateUser(telegramId: number, username: string): Promise<UserDocument> {
    try {
      // Check if user exists
      let user = await User.findByTelegramId(telegramId);

      if (!user) {
        // Create new user
        const isAdmin = env.adminIds.includes(telegramId.toString());
        user = await User.create({
          telegramId,
          username,
          isAdmin,
          isWhitelisted: isAdmin, // Admins are automatically whitelisted
          preferences: {
            defaultModel: env.defaultModel,
            notifications: true
          }
        });

        logInfo('New user created', { telegramId, username, isAdmin });
      } else {
        // Update username if changed
        if (user.username !== username) {
          user.username = username;
          await user.save();
        }
      }

      return user;
    } catch (error) {
      logError('Error in findOrCreateUser', { error, telegramId, username });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_CREATE, error, { telegramId, username }),
        { error }
      );
    }
  }

  /**
   * Add user to whitelist
   */
  async addToWhitelist(telegramId: number): Promise<UserDocument> {
    try {
      const user = await User.findByTelegramId(telegramId);
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { telegramId }),
          { telegramId }
        );
      }

      user.isWhitelisted = true;
      await user.save();

      logInfo('User added to whitelist', { telegramId });
      return user;
    } catch (error) {
      logError('Error adding user to whitelist', { error, telegramId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_UPDATE, error, { telegramId }),
        { error }
      );
    }
  }

  /**
   * Remove user from whitelist
   */
  async removeFromWhitelist(telegramId: number): Promise<UserDocument> {
    try {
      const user = await User.findByTelegramId(telegramId);
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { telegramId }),
          { telegramId }
        );
      }

      if (user.isAdmin) {
        throw createError(
          'AUTHORIZATION',
          formatErrorMessage(ErrorMessages.AUTH_ACCESS, 'Cannot remove admin from whitelist', { telegramId }),
          { telegramId }
        );
      }

      user.isWhitelisted = false;
      await user.save();

      logInfo('User removed from whitelist', { telegramId });
      return user;
    } catch (error) {
      logError('Error removing user from whitelist', { error, telegramId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_UPDATE, error, { telegramId }),
        { error }
      );
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(
    telegramId: number,
    preferences: { defaultModel?: ModelId; notifications?: boolean }
  ): Promise<UserDocument> {
    try {
      const user = await User.findByTelegramId(telegramId);
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { telegramId }),
          { telegramId }
        );
      }

      await user.updatePreferences(preferences);
      logInfo('User preferences updated', { telegramId, preferences });
      return user;
    } catch (error) {
      logError('Error updating user preferences', { error, telegramId, preferences });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_UPDATE, error, { telegramId, preferences }),
        { error }
      );
    }
  }

  /**
   * Get all whitelisted users
   */
  async getWhitelistedUsers(): Promise<UserDocument[]> {
    try {
      return await User.getWhitelistedUsers();
    } catch (error) {
      logError('Error getting whitelisted users', { error });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_READ, error),
        { error }
      );
    }
  }

  /**
   * Get all admin users
   */
  async getAdminUsers(): Promise<UserDocument[]> {
    try {
      return await User.getAdminUsers();
    } catch (error) {
      logError('Error getting admin users', { error });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_READ, error),
        { error }
      );
    }
  }

  /**
   * Check if user has access
   */
  async checkAccess(telegramId: number): Promise<boolean> {
    try {
      const user = await User.findByTelegramId(telegramId);
      if (!user) {
        return false;
      }
      return user.hasAccess();
    } catch (error) {
      logError('Error checking user access', { error, telegramId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.AUTH_ACCESS, error, { telegramId }),
        { error }
      );
    }
  }

  /**
   * Update user's last active timestamp
   */
  async updateLastActive(telegramId: number): Promise<void> {
    try {
      await User.updateLastActive(telegramId);
    } catch (error) {
      logError('Error updating last active timestamp', { error, telegramId });
      // Don't throw error as this is not critical
    }
  }
}

// Export singleton instance
export const userService = new UserService();
export default userService;
