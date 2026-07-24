import { Router } from 'express';
import { getProviders, createProvider, deleteProvider } from '../controllers/provider.js';
const router = Router();
// Demo tenant middleware
router.use((req, res, next) => {
    req.entrepriseId = 'demo-tenant';
    req.userId = 'user-test-id';
    next();
});
router.get('/', getProviders);
router.post('/', createProvider);
router.delete('/:id', deleteProvider);
export default router;
//# sourceMappingURL=provider.js.map