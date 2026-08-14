import { Router } from 'express';
import { getServiceOperations, createServiceOperation, updateServiceOperation } from '../controllers/service.js';

import { requireTenant } from '../middleware/tenant.js';

const router = Router();

// Middleware for extracting auth
router.use(requireTenant);

router.get('/', getServiceOperations);
router.post('/', createServiceOperation);
router.put('/:id', updateServiceOperation);

export default router;
