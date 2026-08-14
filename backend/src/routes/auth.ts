import { Router } from 'express';
import { login, me } from '../controllers/auth.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

router.post('/login', login);
router.get('/me', requireTenant, me);

export default router;
