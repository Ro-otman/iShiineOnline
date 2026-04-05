import { Router } from 'express';

import {
  createAdminQuiz,
  renderAdminContent,
  renderAdminLigue,
  renderAdminOverview,
  renderAdminPayments,
  renderAdminUsers,
  saveAdminLigueSettings,
} from '../controllers/admin.controller.js';
import {
  loginAdmin,
  logoutAdmin,
  renderAdminLogin,
} from '../controllers/adminAuth.controller.js';
import { redirectAuthenticatedAdmin, requireAdminDashboardAuth } from '../middlewares/adminAuth.js';

const router = Router();

router.get('/login', redirectAuthenticatedAdmin, renderAdminLogin);
router.post('/auth/login', loginAdmin);
router.get('/logout', logoutAdmin);
router.post('/auth/logout', logoutAdmin);

router.use(requireAdminDashboardAuth);
router.get('/', renderAdminOverview);
router.get('/users', renderAdminUsers);
router.get('/content', renderAdminContent);
router.post('/content/quiz', createAdminQuiz);
router.post('/quiz', createAdminQuiz);
router.get('/ligue', renderAdminLigue);
router.post('/ligue/settings', saveAdminLigueSettings);
router.get('/payments', renderAdminPayments);

export default router;
