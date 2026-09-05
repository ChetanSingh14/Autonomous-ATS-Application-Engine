import express from 'express';
import cors from 'cors';
import { config } from './config';
import apiRoutes from './routes/api.routes';
import './workers/application.worker'; // Boot up BullMQ async worker process

const app = express();

// Configure CORS to accept requests from Next.js web dashboard and Chrome extension
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Register REST API Routes
app.use('/api', apiRoutes);

// Start Express Server
app.listen(config.port, () => {
  console.log(`=======================================================`);
  console.log(`🚀 Autonomous ATS Application Engine API Backend Online`);
  console.log(`📡 Listening on http://localhost:${config.port}`);
  console.log(`⚡ Environment: ${config.nodeEnv}`);
  console.log(`=======================================================`);
});
