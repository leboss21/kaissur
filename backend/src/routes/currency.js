import { Router } from 'express';
import { getCurrencies, createCurrency } from '../controllers/currency.js';
// Note: In a real app, createCurrency should have Admin authorization middleware
const router = Router();
router.get('/', getCurrencies);
router.post('/', createCurrency);
export default router;
//# sourceMappingURL=currency.js.map