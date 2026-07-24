import { Router } from 'express';
import { getRates, createRate } from '../controllers/rate.js';

const router = Router();

router.get('/', getRates);
router.post('/', createRate);

export default router;
