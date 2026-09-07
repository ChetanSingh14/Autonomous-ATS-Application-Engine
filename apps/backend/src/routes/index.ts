import { Router } from 'express';
import jobRoutes from './job.routes';
import profileRoutes from './profile.routes';
import aiRoutes from './ai.routes';
import ingestionRoutes from './ingestion.routes';

const router = Router();

router.use('/jobs', jobRoutes);
router.use('/profile', profileRoutes);
router.use('/ai', aiRoutes);
router.use('/ingest', ingestionRoutes);

export default router;
