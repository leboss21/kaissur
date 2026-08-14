import { Router } from 'express';
import { getSession, openSession, closeSession, getAllSessions } from '../controllers/session.js';
import { requireTenant } from '../middleware/tenant.js';
import { requireNotDirecteur } from '../middleware/roles.js';

const router = Router();

// Toutes les routes session nécessitent une authentification JWT valide
router.use(requireTenant);

// Lecture de la session courante — accessible à tous les rôles authentifiés
router.get('/current', getSession);

// Vue admin/directeur : toutes les sessions de l'entreprise (lecture seule)
router.get('/all', getAllSessions);

// Ouverture et clôture — interdites aux directeurs (lecture seule)
router.post('/open', requireNotDirecteur, openSession);
router.post('/:sessionId/close', requireNotDirecteur, closeSession);

export default router;
