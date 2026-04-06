import { Router } from 'express';

import authRouter from './auth.routes.js';
import checkoutRouter from './checkout.routes.js';
import healthRouter from './health.routes.js';
import ligueRouter from './ligue.routes.js';
import notificationsRouter from './notifications.routes.js';
import paymentsRouter from './payments.routes.js';
import versionRouter from './version.routes.js';

const router = Router();

router.use('/auth', authRouter);
router.use('/health', healthRouter);
router.use('/version', versionRouter);
router.use('/ligue', ligueRouter);
router.use('/notifications', notificationsRouter);
router.use('/payments', paymentsRouter);
router.use('/shiine_checkout', checkoutRouter);

export default router;
