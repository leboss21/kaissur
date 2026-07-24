import { Router } from 'express';
import { getSession, openSession, closeSession } from '../controllers/session.js';
const router = Router();
// Middleware placeholder for extracting auth
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/current', getSession);
router.post('/open', openSession);
router.post('/:sessionId/close', closeSession);
export default router;
//# sourceMappingURL=session.js.map