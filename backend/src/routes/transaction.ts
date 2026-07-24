import { Router } from 'express';
import { getTransactions, createTransaction } from '../controllers/transaction.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

// All transaction routes require tenant context
router.use(requireTenant);

router.get('/', getTransactions);
router.post('/', createTransaction);

export default router;
