import { Router } from 'express';
import { getReports, generateDailyReport, getMonthlyReport, getConsolidatedReport } from '../controllers/report.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireNotDirecteur } from '../middleware/roles.js';

const router = Router();

router.use(requireTenant);

router.get('/', getReports);
router.post('/generate', requireNotDirecteur, generateDailyReport);
router.get('/monthly', getMonthlyReport);
router.get('/consolidated', getConsolidatedReport);

export default router;
