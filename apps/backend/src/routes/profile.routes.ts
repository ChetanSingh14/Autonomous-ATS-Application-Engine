import { Router } from 'express';
import { ProfileController } from '../controllers/profile.controller';

const router = Router();
const controller = new ProfileController();

router.get('/', controller.getProfile);
router.put('/', controller.updateProfile);
router.post('/parse-resume', controller.parseResume);

export default router;
