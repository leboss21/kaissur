import { Router } from 'express';
import { getReceipts, getReceiptDetails } from '../controllers/receipt.js';

const router = Router();

router.use((req, res, next) => {
  (req as any).entrepriseId = 'demo-tenant';
  (req as any).userId = 'user-test-id';
  next();
});

router.get('/', getReceipts);
router.get('/:id', getReceiptDetails);

export default router;
