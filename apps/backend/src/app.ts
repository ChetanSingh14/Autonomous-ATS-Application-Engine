import express, { Application } from 'express';
import cors from 'cors';
import apiRoutes from './routes';
import { errorHandler } from './middlewares/error-handler';

const app: Application = express();

// Configure CORS for web dashboard & browser extension runner
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

// Register Modular API Routes
app.use('/api', apiRoutes);

// Register Centralized Error Handler Middleware
app.use(errorHandler);

export default app;
