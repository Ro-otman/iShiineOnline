import { Router } from 'express';

import {
  initPaymentCheckout,
  verifyPaymentCheckout,
} from '../controllers/paymentCheckout.controller.js';
import { requireUserAuth } from '../middlewares/userAuth.js';

const router = Router();

router.use(requireUserAuth);
router.post('/checkout/init', initPaymentCheckout);
router.post('/checkout/verify', verifyPaymentCheckout);

export default router;
