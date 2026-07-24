import { Router } from 'express';
import { getEntreprise, updateEntreprise } from '../controllers/entreprise.js';
const router = Router();
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/', getEntreprise);
router.put('/', updateEntreprise);
export default router;
//# sourceMappingURL=entreprise.js.map