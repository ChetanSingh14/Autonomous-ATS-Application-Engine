import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { config } from './config';

// Initialize Redis client connection with optional TLS support for Upstash
export const redisConnection = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tls ? {} : undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: false,
});

redisConnection.on('error', (err) => {
  console.warn('[Redis Warning] Failed to connect to Redis queue:', err.message);
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${config.redis.host}:${config.redis.port} (TLS: ${config.redis.tls})`);
});

// Initialize BullMQ task queue for asynchronous job evaluation and tailoring
export const evaluateQueue = new Queue('evaluate-job', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
});
