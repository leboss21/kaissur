import { Router } from 'express';
import { getEntreprise, updateEntreprise } from '../controllers/entreprise.js';

const router = Router();

router.use((req, res, next) => {
  (req as any).entrepriseId = 'demo-tenant';
  (req as any).userId = 'user-test-id';
  next();
});

router.get('/', getEntreprise);
router.put('/', updateEntreprise);

export default router;
