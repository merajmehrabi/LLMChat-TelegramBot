import TelegramBot from 'node-telegram-bot-api';
import { Document, Types } from 'mongoose';
import { userService, conversationService, usageService } from '../services';
import { UserDocument } from '../models/types';
import { createError } from '../types/errors';
import { logError, logInfo } from '../config/logger.config';
import { formatErrorMessage, ErrorMessages } from '../utils';
import env from '../config/env.config';
import { ModelId, AVAILABLE_MODELS } from '../config/openrouter.config';

class BotController {
  private bot!: TelegramBot;
  private commands: Record<string, (msg: TelegramBot.Message) => Promise<void>>;

  constructor() {
    logInfo('Initializing bot controller...', { 
      nodeEnv: env.nodeEnv,
      defaultModel: env.defaultModel,
      telegramToken: env.telegramToken ? 'Set' : 'Not Set'
    });

    // Initialize commands
    this.commands = {
      '/start': this.handleStart.bind(this),
      '/newchat': this.handleNewChat.bind(this),
      '/clearchat': this.handleClearChat.bind(this),
      '/changemodel': this.handleChangeModel.bind(this),
      '/usage': this.handleUsage.bind(this),
      '/help': this.handleHelp.bind(this)
    };
  }

  public async initializeBot(): Promise<void> {
    try {
      // Validate environment
      if (!env.telegramToken) {
        throw new Error('TELEGRAM_BOT_TOKEN is not set in environment variables');
      }
      
      logInfo('Creating bot instance...');
      
      // Create bot instance with debug mode in development
      this.bot = new TelegramBot(env.telegramToken, { 
        polling: {
          interval: 300,
          autoStart: false,
          params: {
            timeout: 10
          }
        },
        filepath: false,
        baseApiUrl: 'https://api.telegram.org'
      });

      logInfo('Bot instance created, verifying connection...');

      // Verify connection before setting up handlers
      await this.verifyBotConnection();
      
      // Set up handlers
      this.setupMessageHandler();
      this.setupErrorHandler();
      
      // Start polling after everything is set up
      logInfo('Starting bot polling...');
      await this.bot.startPolling();
      
      logInfo('Bot initialization complete');
    } catch (error) {
      logError('Failed to initialize bot', { 
        error,
        token: env.telegramToken ? env.telegramToken.substring(0, 10) + '...' : 'Not Set'
      });
      throw error;
    }
  }

  /**
   * Set up message handler for all messages
   */
  private setupMessageHandler(): void {
    logInfo('Setting up message handler...');
    
    this.bot.on('message', async (msg) => {
      logInfo('Received message event', { 
        text: msg.text, 
        chatId: msg.chat.id,
        from: msg.from?.username,
        type: msg.text?.startsWith('/') ? 'command' : 'message'
      });

      try {
        // Ensure message has text
        if (!msg.text) {
          logInfo('Ignoring non-text message');
          return;
        }

        // Handle commands
        if (msg.text.startsWith('/')) {
          const command = Object.keys(this.commands).find(cmd => msg.text!.startsWith(cmd));
          if (command) {
            logInfo('Handling command', { command, chatId: msg.chat.id });
            // Skip access check for /start command
            if (command === '/start') {
              await this.commands[command](msg);
            } else {
              await this.checkAccess(msg);
              await this.commands[command](msg);
            }
          }
          return;
        }

        // Handle regular messages
        logInfo('Processing regular message', { chatId: msg.chat.id });
        await this.checkAccess(msg);
        await this.handleMessage(msg);
      } catch (error) {
        logError('Error handling message', { error });
        await this.handleError(msg, error);
      }
    });

    // Add update listener for debugging
    this.bot.on('polling_error', (error) => {
      logError('Polling error occurred', { error });
    });

    this.bot.on('webhook_error', (error) => {
      logError('Webhook error occurred', { error });
    });

    logInfo('Message handler setup complete');
  }

  /**
   * Set up error handler
   */
  private setupErrorHandler(): void {
    // Handle polling errors
    this.bot.on('polling_error', (error: any) => {
      const errorDetails = {
        message: error.message || 'Unknown error',
        code: error.code,
        response: error.response?.body,
        stack: error.stack
      };
      logError('Telegram polling error', { error: errorDetails });
      
      // Try to reconnect
      setTimeout(() => {
        logInfo('Attempting to restart polling...');
        this.bot.stopPolling()
          .then(() => {
            logInfo('Polling stopped successfully');
            return this.bot.startPolling();
          })
          .then(() => {
            logInfo('Polling restarted successfully');
          })
          .catch(error => {
            logError('Failed to restart polling', { error });
          });
      }, 5000);
    });

    // Handle general errors
    this.bot.on('error', (error: Error) => {
      logError('Telegram bot error', {
        error: {
          message: error.message,
          stack: error.stack
        }
      });
    });

    // Log successful initialization
    logInfo('Bot controller initialized successfully');
  }

  /**
   * Check user access
   */
  private async checkAccess(msg: TelegramBot.Message): Promise<void> {
    const hasAccess = await userService.checkAccess(msg.from!.id);
    if (!hasAccess) {
      throw createError(
        'AUTHORIZATION',
        formatErrorMessage(ErrorMessages.AUTH_ACCESS, 'User not authorized', {
          userId: msg.from!.id
        })
      );
    }
  }

  /**
   * Handle /start command
   */
  private async handleStart(msg: TelegramBot.Message): Promise<void> {
    const user: UserDocument = await userService.findOrCreateUser(
      msg.from!.id,
      msg.from!.username || 'unknown'
    );

    const response = user.isWhitelisted
      ? 'Welcome! You can start chatting with me. Use /help to see available commands.'
      : 'Welcome! Your access is pending approval. Please contact an administrator.';

    await this.bot.sendMessage(msg.chat.id, response);
  }

  /**
   * Verify bot connection
   */
  private async verifyBotConnection(): Promise<void> {
    try {
      const botInfo = await this.bot.getMe();
      logInfo('Bot connected successfully', { 
        username: botInfo.username,
        firstName: botInfo.first_name,
        id: botInfo.id
      });

      // Test webhook status
      const webhookInfo = await this.bot.setWebHook('');
      logInfo('Webhook disabled for polling mode', { webhookInfo });

      // Log polling status
      logInfo('Bot polling started', {
        pollingInterval: 300,
        timeout: 10
      });
    } catch (error) {
      logError('Failed to verify bot connection', { error });
      throw error;
    }
  }

  private async handleNewChat(msg: TelegramBot.Message): Promise<void> {
    const defaultModel = env.defaultModel as ModelId;
    const conversation = await conversationService.createConversation(
      msg.from!.id.toString(),
      defaultModel
    );

    await this.bot.sendMessage(
      msg.chat.id,
      'Started a new conversation. You can start chatting!'
    );
  }

  /**
   * Handle /clearchat command
   */
  private async handleClearChat(msg: TelegramBot.Message): Promise<void> {
    // Get user's active conversation
    const conversations = await conversationService.getUserConversations(
      msg.from!.id.toString()
    );
    if (conversations.length === 0) {
      await this.bot.sendMessage(msg.chat.id, 'No active conversation to clear.');
      return;
    }

    await conversationService.clearHistory(conversations[0].id);
    await this.bot.sendMessage(msg.chat.id, 'Conversation history cleared.');
  }

  /**
   * Handle /changemodel command
   */
  private async handleChangeModel(msg: TelegramBot.Message): Promise<void> {
    // Get user's active conversation
    const conversations = await conversationService.getUserConversations(
      msg.from!.id.toString()
    );
    if (conversations.length === 0) {
      await this.bot.sendMessage(
        msg.chat.id,
        'Start a new conversation first with /newchat'
      );
      return;
    }

    // Create keyboard with available models
    const keyboard = (Object.entries(AVAILABLE_MODELS) as Array<[ModelId, { name: string; contextWindow: number }]>).map(([id, info]) => [{
      text: `${info.name} (${info.contextWindow.toLocaleString()} tokens)`,
      callback_data: `model:${id}`
    }]);

    await this.bot.sendMessage(
      msg.chat.id,
      'Select a model to use:',
      {
        reply_markup: {
          inline_keyboard: keyboard
        }
      }
    );

    // Handle model selection callback
    this.bot.on('callback_query', async (query) => {
      if (!query.data?.startsWith('model:')) return;

      const modelId = query.data.replace('model:', '') as ModelId;
      await conversationService.updateModel(conversations[0].id, modelId);

      await this.bot.answerCallbackQuery(query.id);
      await this.bot.sendMessage(
        msg.chat.id,
        `Switched to ${AVAILABLE_MODELS[modelId].name}`
      );
    });
  }

  /**
   * Handle /usage command
   */
  private async handleUsage(msg: TelegramBot.Message): Promise<void> {
    // Get user's ObjectId
    const user: UserDocument = await userService.findOrCreateUser(
      msg.from!.id,
      msg.from!.username || 'unknown'
    );
    
    // Get user's MongoDB ObjectId
    const stats = await usageService.getUserUsage(user.id);
    const response = `Your usage statistics:
• Total tokens: ${stats.totalTokens.toLocaleString()}
• Total cost: $${stats.totalCost.toFixed(4)}

Model breakdown:
${(Object.entries(stats.modelBreakdown) as Array<[ModelId, { tokens: number; cost: number }]>)
  .map(
    ([model, data]) =>
      `${model}:
  • Tokens: ${data.tokens.toLocaleString()}
  • Cost: $${data.cost.toFixed(4)}`
  )
  .join('\n')}`;

    await this.bot.sendMessage(msg.chat.id, response);
  }

  /**
   * Handle /help command
   */
  private async handleHelp(msg: TelegramBot.Message): Promise<void> {
    const commands = [
      '/newchat - Start a fresh conversation',
      '/clearchat - Clear conversation history',
      '/changemodel - Switch between available models',
      '/usage - View your usage statistics',
      '/help - Show this help message'
    ];

    await this.bot.sendMessage(msg.chat.id, commands.join('\n'));
  }

  /**
   * Handle regular messages
   */
  private async handleMessage(msg: TelegramBot.Message): Promise<void> {
    // Get user's active conversation
    const conversations = await conversationService.getUserConversations(
      msg.from!.id.toString()
    );
    if (conversations.length === 0) {
      await this.bot.sendMessage(
        msg.chat.id,
        'Start a new conversation first with /newchat'
      );
      return;
    }

    // Send typing action
    await this.bot.sendChatAction(msg.chat.id, 'typing');

    // We know msg.text exists because we checked at the start of message handling
    const result = await conversationService.sendMessage(
      conversations[0].id,
      msg.text!
    );

    // Send response
    await this.bot.sendMessage(msg.chat.id, result.response.content);
  }

  /**
   * Handle errors
   */
  private async handleError(
    msg: TelegramBot.Message,
    error: unknown
  ): Promise<void> {
    logError('Bot error', { error, userId: msg.from!.id });

    const errorMessage =
      error instanceof Error ? error.message : 'An unexpected error occurred';
    await this.bot.sendMessage(
      msg.chat.id,
      `Sorry, something went wrong: ${errorMessage}`
    );
  }
}

// Export singleton instance
export const botController = new BotController();
export default botController;
