import { Router } from 'express';
import { getEntreprise, updateEntreprise, getMainCash, depositMainCash, supplyCashierService } from '../controllers/entreprise.js';
import { requireTenant } from '../middleware/tenant.js';

const router = Router();

router.use(requireTenant);

router.get('/', getEntreprise);
router.put('/', updateEntreprise);

router.get('/main-cash', getMainCash);
router.post('/main-cash/deposit', depositMainCash);
router.post('/main-cash/supply', supplyCashierService);

export default router;
