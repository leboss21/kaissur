import { Router } from 'express';
import { getServiceOperations, createServiceOperation } from '../controllers/service.js';
import { requireTenant } from '../middleware/tenant.js';
const router = Router();
// Middleware for extracting auth
router.use(requireTenant);
router.get('/', getServiceOperations);
router.post('/', createServiceOperation);
export default router;
//# sourceMappingURL=service.js.map