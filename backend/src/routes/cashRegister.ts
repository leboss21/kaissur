import { Router } from 'express';
import { getCashRegisters, adjustCashRegister } from '../controllers/cashRegister.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();
router.use(requireTenant);

// Lecture accessible à tous les rôles authentifiés
router.get('/', getCashRegisters);

// Ajustement manuel — ADMIN uniquement
router.post('/adjust', requireAdmin, adjustCashRegister);

export default router;

