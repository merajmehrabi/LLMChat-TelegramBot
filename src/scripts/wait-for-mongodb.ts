import mongoose from 'mongoose';

async function waitForMongoDB(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('Waiting for MongoDB to be ready...');
  
  while (true) {
    try {
      await mongoose.connect(mongoUri);
      const db = mongoose.connection.db;
      if (!db) {
        throw new Error('Database connection not established');
      }
      await db.admin().ping();
      console.log('MongoDB is ready!');
      await mongoose.disconnect();
      process.exit(0);
    } catch (error) {
      console.log('MongoDB not ready, waiting...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

waitForMongoDB().catch(error => {
  console.error('Failed to connect to MongoDB:', error);
  process.exit(1);
});
