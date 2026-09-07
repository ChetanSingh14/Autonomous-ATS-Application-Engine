import { Router } from 'express';
import { JobController } from '../controllers/job.controller';

const router = Router();
const controller = new JobController();

router.get('/next-queued', controller.getNextQueued);
router.get('/dashboard-stats', controller.getDashboardStats);
router.get('/', controller.getJobs);
router.get('/:id', controller.getJobById);
router.post('/ingest-custom', controller.ingestCustomJob);
router.post('/:id/applied', controller.markApplied);
router.post('/:id/reject', controller.rejectJob);

export default router;
