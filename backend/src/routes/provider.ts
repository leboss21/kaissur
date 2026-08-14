import { Router } from 'express';
import { getProviders, createProvider, deleteProvider } from '../controllers/provider.js';

import { requireTenant } from '../middleware/tenant.js';

const router = Router();

router.use(requireTenant);

router.get('/', getProviders);
router.post('/', createProvider);
router.delete('/:id', deleteProvider);

export default router;
