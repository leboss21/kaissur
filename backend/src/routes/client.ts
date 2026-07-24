import { Router } from 'express';
import { getClients, createClient, getClientById } from '../controllers/client.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

// Apply tenant middleware to all client routes
router.use(requireTenant);

router.get('/', getClients);
router.post('/', createClient);
router.get('/:id', getClientById);

export default router;
