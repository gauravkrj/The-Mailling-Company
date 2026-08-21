import Redis from 'ioredis';
import { config } from './config.js';

export const redisConnection = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  retryStrategy(times) {
    if (times > 3) {
      console.warn('⚠️ Redis connection failed. Falling back to inline queue execution mode.');
      return null; // Stop retrying for fallback
    }
    return Math.min(times * 100, 2000);
  },
});

redisConnection.on('error', (err) => {
  // Silent fail catch for fallback
});
