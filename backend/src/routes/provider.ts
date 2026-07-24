import { Router } from 'express';
import { getProviders, createProvider, deleteProvider } from '../controllers/provider.js';

const router = Router();

// Demo tenant middleware
router.use((req, res, next) => {
  (req as any).entrepriseId = 'demo-tenant';
  (req as any).userId = 'user-test-id';
  next();
});

router.get('/', getProviders);
router.post('/', createProvider);
router.delete('/:id', deleteProvider);

export default router;
