import { Router } from 'express';
import { getReceipts, getReceiptDetails } from '../controllers/receipt.js';

import { requireTenant } from '../middleware/tenant.js';

const router = Router();

router.use(requireTenant);

router.get('/', getReceipts);
router.get('/:id', getReceiptDetails);

export default router;
