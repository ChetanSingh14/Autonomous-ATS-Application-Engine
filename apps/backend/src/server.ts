import app from './app';
import { config } from './config';
import { prisma } from './lib/prisma';
import './workers/application.worker'; // Boot up BullMQ async worker process

const server = app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Autonomous ATS Application Engine API Backend Online`);
  console.log(`📡 Listening on http://localhost:${config.port}`);
  console.log(`⚡ Environment: ${config.nodeEnv}`);
  console.log(`=======================================================`);
});

// Graceful Shutdown Handling
const gracefulShutdown = async (signal: string) => {
  console.log(`\n[Server] Received ${signal}. Commencing graceful shutdown...`);

  server.close(async () => {
    console.log('[Server] HTTP server closed.');
    try {
      await prisma.$disconnect();
      console.log('[Database] Prisma client disconnected cleanly.');
    } catch (err: any) {
      console.error('[Database Error] Error disconnecting Prisma:', err.message);
    }
    process.exit(0);
  });

  // Force exit if shutdown hangs over 10s
  setTimeout(() => {
    console.error('[Server Error] Forcing exit due to hanging connections.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
