import mongoose from 'mongoose';
import { connectDB } from '../config';
import { userService } from '../services';
import { logError, logInfo } from '../config/logger.config';

async function addUser() {
  const telegramId = process.env.TELEGRAM_ID;
  const username = process.env.USERNAME;
  const isAdmin = process.env.IS_ADMIN === 'true';
  const isWhitelisted = process.env.IS_WHITELISTED === 'true';

  if (!telegramId || !username) {
    console.error('Usage: TELEGRAM_ID=123456 USERNAME=johndoe [IS_ADMIN=true] [IS_WHITELISTED=true] npm run add:user');
    process.exit(1);
  }

  try {
    // Connect to database
    await connectDB();
    logInfo('Database connected');

    // Create user
    const user = await userService.findOrCreateUser(
      parseInt(telegramId),
      username
    );

    // Update admin/whitelist status if specified
    if (isAdmin || isWhitelisted) {
      user.isAdmin = isAdmin;
      user.isWhitelisted = isWhitelisted;
      await user.save();
    }

    logInfo('User created/updated successfully', {
      id: user.id,
      telegramId: user.telegramId,
      username: user.username,
      isAdmin: user.isAdmin,
      isWhitelisted: user.isWhitelisted
    });

  } catch (error) {
    logError('Failed to add user', { error });
    throw error;
  } finally {
    // Close database connection
    await mongoose.connection.close();
    logInfo('Database connection closed');
  }
}

// Run script
addUser()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to add user:', error);
    process.exit(1);
  });
