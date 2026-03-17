import { Router } from 'express';

import { shiineCheckout } from '../controllers/checkout.controller.js';

const router = Router();

router.all('/', shiineCheckout);

export default router;
