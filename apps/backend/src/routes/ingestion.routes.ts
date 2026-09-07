import { Router } from 'express';
import { IngestionController } from '../controllers/ingestion.controller';

const router = Router();
const controller = new IngestionController();

router.post('/', controller.triggerIngestion);

export default router;
