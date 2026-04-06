import { Router } from 'express';

import { createMobileSession } from '../controllers/mobileAuth.controller.js';
import { optionalUserAuth } from '../middlewares/userAuth.js';

const router = Router();

router.post('/mobile/session', optionalUserAuth, createMobileSession);

export default router;
