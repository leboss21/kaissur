import { Router } from 'express';
import { getUsers, updateUserRole, createUser } from '../controllers/user.js';
import { requireTenant } from '../middleware/tenant.js';
const router = Router();
router.use(requireTenant);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
export default router;
//# sourceMappingURL=user.js.map