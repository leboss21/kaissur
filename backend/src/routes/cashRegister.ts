import { Router } from 'express';
import { getCashRegisters, adjustCashRegister } from '../controllers/cashRegister.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();
router.use(requireTenant);

router.get('/', getCashRegisters);
router.post('/adjust', adjustCashRegister);

export default router;
