import { Router } from 'express';
import { getReports, generateDailyReport } from '../controllers/report.js';
const router = Router();
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/', getReports);
router.post('/generate', generateDailyReport);
export default router;
//# sourceMappingURL=report.js.map