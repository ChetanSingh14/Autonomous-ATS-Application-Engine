import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';

const router = Router();
const controller = new AIController();

router.post('/answer-question', controller.answerQuestion);

export default router;
