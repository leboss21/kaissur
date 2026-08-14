import { Router } from 'express';
import { getUsers, updateUserRole, createUser, updateUser, deleteUser } from '../controllers/user.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireAdmin } from '../middleware/roles.js';

const router = Router();

router.use(requireTenant);
router.use(requireAdmin); // Only ADMIN can access user management

router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id/role', updateUserRole);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;

