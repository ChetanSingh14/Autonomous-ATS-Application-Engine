import { Queue, ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { config } from './config';

// Redis options tailored for cloud/serverless Redis (Upstash) and BullMQ
export const redisOptions: ConnectionOptions = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  tls: config.redis.tls ? {} : undefined,
  maxRetriesPerRequest: null,
  enableOfflineQueue: true,
  keepAlive: 10000, // Send keep-alive ping every 10s to prevent Upstash TCP idle disconnects
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

// Standalone Redis client instance for direct commands / event monitoring
export const redisConnection = new Redis(redisOptions as any);

redisConnection.on('error', (err) => {
  console.warn('[Redis Warning] Failed to connect to Redis queue:', err.message);
});

redisConnection.on('connect', () => {
  console.log(`[Redis] Connected successfully to ${config.redis.host}:${config.redis.port} (TLS: ${config.redis.tls})`);
});

// Initialize BullMQ task queue for asynchronous job evaluation and tailoring
export const evaluateQueue = new Queue('evaluate-job', {
  connection: redisOptions,
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

