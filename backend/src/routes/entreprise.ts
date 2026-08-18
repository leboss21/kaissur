import { Router } from 'express';
import { getEntreprise, updateEntreprise, getMainCash, depositMainCash, supplyCashierService } from '../controllers/entreprise.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireChefCaisseOrAdmin } from '../middleware/roles.js';

const router = Router();

router.use(requireTenant);

router.get('/', getEntreprise);
router.put('/', updateEntreprise);

router.get('/main-cash', requireChefCaisseOrAdmin, getMainCash);
router.post('/main-cash/deposit', requireChefCaisseOrAdmin, depositMainCash);
router.post('/main-cash/supply', requireChefCaisseOrAdmin, supplyCashierService);

export default router;
