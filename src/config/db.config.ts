import mongoose from 'mongoose';
import env from './env.config';
import { logError, logInfo } from './logger.config';

// Configure mongoose
mongoose.set('strictQuery', true);

// Connection options
const options = {
  autoIndex: true,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4
};

// Connect to MongoDB
export const connectDB = async (): Promise<void> => {
  try {
    logInfo('Connecting to MongoDB...', { uri: env.mongoUri });
    
    // Handle connection events
    mongoose.connection.on('connected', () => {
      logInfo('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (error) => {
      logError('MongoDB connection error', { error });
    });

    mongoose.connection.on('disconnected', () => {
      logInfo('MongoDB disconnected');
    });

    // Connect with retry logic
    let retries = 5;
    while (retries > 0) {
      try {
        await mongoose.connect(env.mongoUri, options);
        break;
      } catch (error) {
        retries--;
        if (retries === 0) {
          logError('Failed to connect to MongoDB after 5 attempts', { error });
          throw error;
        }
        logInfo(`Retrying MongoDB connection... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Handle process termination
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logInfo('MongoDB connection closed through app termination');
        process.exit(0);
      } catch (error) {
        logError('Error closing MongoDB connection', { error });
        process.exit(1);
      }
    });

  } catch (error) {
    logError('MongoDB connection error', { error });
    throw error;
  }
};

export default connectDB;
