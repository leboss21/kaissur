import { Router } from 'express';
import { getSession, openSession, closeSession } from '../controllers/session.js';

const router = Router();

// Middleware placeholder for extracting auth
router.use((req, res, next) => {
  (req as any).entrepriseId = 'demo-tenant';
  (req as any).userId = 'user-test-id';
  next();
});

router.get('/current', getSession);
router.post('/open', openSession);
router.post('/:sessionId/close', closeSession);

export default router;
