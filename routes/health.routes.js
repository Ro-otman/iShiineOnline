import { Router } from 'express';

import { getDbHealth, getHealth } from '../controllers/health.controller.js';

const router = Router();

router.get('/', getHealth);
router.get('/db', getDbHealth);

export default router;
