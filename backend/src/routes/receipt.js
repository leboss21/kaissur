import { Router } from 'express';
import { getReceipts, getReceiptDetails } from '../controllers/receipt.js';
const router = Router();
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/', getReceipts);
router.get('/:id', getReceiptDetails);
export default router;
//# sourceMappingURL=receipt.js.map