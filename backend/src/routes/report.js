import { Router } from 'express';
import { getReports, generateDailyReport, getMonthlyReport } from '../controllers/report.js';
const router = Router();
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/', getReports);
router.post('/generate', generateDailyReport);
router.get('/monthly', getMonthlyReport);
export default router;
//# sourceMappingURL=report.js.map