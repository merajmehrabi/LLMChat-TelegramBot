import { Conversation, ConversationDocument, User } from '../models';
import { IMessage } from '../models/types';
import { ModelId } from '../config/openrouter.config';
import { createError } from '../types/errors';
import { logError, logInfo } from '../config/logger.config';
import { openRouterClient } from '../config';
import { formatErrorMessage, ErrorMessages } from '../utils/error.utils';
import { usageService } from './usage.service';

class ConversationService {
  /**
   * Create a new conversation
   */
  async createConversation(
    userId: string,
    model: ModelId,
    title?: string
  ): Promise<ConversationDocument> {
    try {
      // Find user first to get their ObjectId
      const user = await User.findByTelegramId(parseInt(userId));
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { userId }),
          { userId }
        );
      }

      // Set model in OpenRouter client
      openRouterClient.setModel(model);

      const conversation = await Conversation.create({
        userId: user._id, // Use the user's ObjectId
        model,
        title,
        messages: [],
        totalTokens: 0,
        totalCost: 0
      });

      logInfo('New conversation created with model', { userId, model, conversationId: conversation.id });
      return conversation;
    } catch (error) {
      logError('Error creating conversation', { error, userId, model });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_CREATE, error, { userId, model }),
        { error }
      );
    }
  }

  /**
   * Get user's conversations
   */
  async getUserConversations(userId: string): Promise<ConversationDocument[]> {
    try {
      const user = await User.findByTelegramId(parseInt(userId));
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { userId }),
          { userId }
        );
      }
      return await Conversation.findByUserId(user._id);
    } catch (error) {
      logError('Error getting user conversations', { error, userId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_READ, error, { userId }),
        { error }
      );
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversation(conversationId: string): Promise<ConversationDocument | null> {
    try {
      return await Conversation.findWithMessages(conversationId);
    } catch (error) {
      logError('Error getting conversation', { error, conversationId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_READ, error, { conversationId }),
        { error }
      );
    }
  }

  /**
   * Add message to conversation and get AI response
   */
  async sendMessage(
    conversationId: string,
    content: string
  ): Promise<{ message: IMessage; response: IMessage }> {
    try {
      const conversation = await this.getConversation(conversationId) as ConversationDocument;
      if (!conversation) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'Conversation not found', { conversationId }),
          { conversationId }
        );
      }

      // Ensure OpenRouter client is using the conversation's model
      openRouterClient.setModel(conversation.model);

      // Create user message
      const userMessage: IMessage = {
        role: 'user',
        content,
        timestamp: new Date(),
        model: conversation.model
      };

      // Get AI response
      const context = conversation.getContext();
      const messages = [...context, userMessage];
      const result = await openRouterClient.createChatCompletion(messages);

      // Create assistant message
      const assistantMessage: IMessage = {
        role: 'assistant',
        content: result.content,
        timestamp: new Date(),
        model: conversation.model,
        tokens: {
          prompt: result.usage.prompt_tokens,
          completion: result.usage.completion_tokens,
          total: result.usage.total_tokens
        },
        cost: result.cost
      };

      // Add both messages to conversation
      await conversation.addMessage(userMessage);
      await conversation.addMessage(assistantMessage);

      // Get user ID from conversation
      const user = await User.findById(conversation.get('userId'));
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { conversationId }),
          { conversationId }
        );
      }

      // Track usage statistics
      await usageService.trackUsage(
        user.id,
        conversationId,
        conversation.model,
        {
          prompt: result.usage.prompt_tokens,
          completion: result.usage.completion_tokens,
          total: result.usage.total_tokens
        },
        result.cost
      );

      logInfo('Messages added to conversation', {
        conversationId,
        userMessageLength: content.length,
        responseLength: result.content.length,
        tokens: result.usage,
        cost: result.cost
      });

      return {
        message: userMessage,
        response: assistantMessage
      };
    } catch (error) {
      logError('Error sending message', { error, conversationId });
      throw createError(
        'MODEL',
        formatErrorMessage(ErrorMessages.MODEL_REQUEST, error, { conversationId }),
        { error }
      );
    }
  }

  /**
   * Clear conversation history
   */
  async clearHistory(conversationId: string): Promise<ConversationDocument> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'Conversation not found', { conversationId }),
          { conversationId }
        );
      }

      await conversation.clearHistory();
      logInfo('Conversation history cleared', { conversationId });
      return conversation;
    } catch (error) {
      logError('Error clearing conversation history', { error, conversationId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_UPDATE, error, { conversationId }),
        { error }
      );
    }
  }

  /**
   * Update conversation model
   */
  async updateModel(
    conversationId: string,
    model: ModelId
  ): Promise<ConversationDocument> {
    try {
      const conversation = await this.getConversation(conversationId);
      if (!conversation) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'Conversation not found', { conversationId }),
          { conversationId }
        );
      }

      // Update model in both conversation and OpenRouter client
      await conversation.updateModel(model);
      openRouterClient.setModel(model);
      logInfo('Conversation and client model updated', { conversationId, model });
      return conversation;
    } catch (error) {
      logError('Error updating conversation model', { error, conversationId, model });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_UPDATE, error, { conversationId, model }),
        { error }
      );
    }
  }

  /**
   * Get conversation statistics
   */
  async getConversationStats(userId: string) {
    try {
      const user = await User.findByTelegramId(parseInt(userId));
      if (!user) {
        throw createError(
          'NOT_FOUND',
          formatErrorMessage(ErrorMessages.RESOURCE_NOT_FOUND, 'User not found', { userId }),
          { userId }
        );
      }
      return await Conversation.getUserStats(user._id);
    } catch (error) {
      logError('Error getting conversation stats', { error, userId });
      throw createError(
        'DATABASE',
        formatErrorMessage(ErrorMessages.DB_READ, error, { userId }),
        { error }
      );
    }
  }
}

// Export singleton instance
export const conversationService = new ConversationService();
export default conversationService;
