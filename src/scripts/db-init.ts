import mongoose from 'mongoose';
import { userService } from '../services';
import { connectDB } from '../config';
import { logError, logInfo } from '../config/logger.config';
import env from '../config/env.config';

async function initializeDatabase() {
  try {
    // Connect to database
    await connectDB();
    logInfo('Database connected');

    // Initialize admin users if not exists
    const adminIds = env.adminIds;
    if (adminIds.length === 0) {
      throw new Error('ADMIN_TELEGRAM_IDS is not set in environment variables');
    }

    for (const adminId of adminIds) {
      const adminUser = await userService.findOrCreateUser(
        parseInt(adminId),
        `admin_${adminId}`
      );

      logInfo('Admin user initialized', {
        id: adminUser.id,
        telegramId: adminUser.telegramId,
        isAdmin: adminUser.isAdmin,
        isWhitelisted: adminUser.isWhitelisted
      });
    }

    // Initialize other collections if needed
    // For example, ensuring indexes are created
    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('Database connection not established');
    }

    await db.collection('conversations').createIndex(
      { userId: 1, createdAt: -1 },
      { background: true }
    );
    
    await db.collection('usages').createIndex(
      { userId: 1, createdAt: -1 },
      { background: true }
    );

    logInfo('Database initialization completed successfully');
  } catch (error) {
    logError('Failed to initialize database', { error });
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logInfo('Database connection closed');
  }
}

// Run initialization
initializeDatabase()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Database initialization failed:', error);
    process.exit(1);
  });
