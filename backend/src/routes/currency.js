import { Router } from 'express';
import { getCurrencies, createCurrency, updateCurrencyMargin } from '../controllers/currency.js';
const router = Router();
router.get('/', getCurrencies);
router.post('/', createCurrency);
router.patch('/:code/margin', updateCurrencyMargin);
export default router;
//# sourceMappingURL=currency.js.map