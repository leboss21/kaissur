import { Router } from 'express';
import {
  getPlatformStats,
  getEntreprises,
  createEntreprise,
  updateEntreprise,
  toggleEntrepriseStatus,
  resetAdminPassword
} from '../controllers/superadmin.js';
import { requireAuth } from '../middleware/tenant.js';
import { requireSuperAdmin } from '../middleware/roles.js';

const router = Router();

// Toutes les routes SuperAdmin nécessitent une authentification et le rôle SUPER_ADMIN
router.use(requireAuth);
router.use(requireSuperAdmin);

router.get('/stats', getPlatformStats);
router.get('/entreprises', getEntreprises);
router.post('/entreprises', createEntreprise);
router.put('/entreprises/:id', updateEntreprise);
router.patch('/entreprises/:id/status', toggleEntrepriseStatus);
router.post('/entreprises/:id/reset-admin', resetAdminPassword);

export default router;
