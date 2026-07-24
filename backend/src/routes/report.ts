import { Router } from 'express';
import { getReports, generateDailyReport, getMonthlyReport } from '../controllers/report.js';

const router = Router();

router.use((req, res, next) => {
  (req as any).entrepriseId = 'demo-tenant';
  (req as any).userId = 'user-test-id';
  next();
});

router.get('/', getReports);
router.post('/generate', generateDailyReport);
router.get('/monthly', getMonthlyReport);

export default router;
