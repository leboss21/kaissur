import { Router } from 'express';
import { getTransactions, createTransaction, updateTransaction } from '../controllers/transaction.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

// All transaction routes require tenant context
router.use(requireTenant);

router.get('/', getTransactions);
router.post('/', createTransaction);
router.put('/:id', updateTransaction);

export default router;
