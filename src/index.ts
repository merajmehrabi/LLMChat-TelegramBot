import { connectDB } from './config';
import { botController } from './controllers';
import { logError, logInfo } from './config/logger.config';

// Initialize application
async function initializeApp() {
  try {
    // Connect to database
    await connectDB();
    logInfo('Database connected');

    // Initialize bot controller and wait for it to be ready
    logInfo('Initializing bot controller...');
    await botController.initializeBot();
    logInfo('Bot controller initialized successfully');

    // Log startup
    logInfo('Application started successfully');
  } catch (error) {
    logError('Failed to initialize application', { error });
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logError('Uncaught exception', { error });
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  logError('Unhandled rejection', { error });
  process.exit(1);
});

// Start application
initializeApp();
