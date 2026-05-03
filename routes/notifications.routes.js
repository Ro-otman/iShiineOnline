import { Router } from 'express';

import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerDevice,
  syncReviewItems,
  unregisterDevice,
} from '../controllers/notifications.controller.js';
import { requireUserAuth } from '../middlewares/userAuth.js';

const router = Router();

router.use(requireUserAuth);
router.get('/', listNotifications);
router.post('/devices/register', registerDevice);
router.post('/devices/unregister', unregisterDevice);
router.post('/reviews/sync', syncReviewItems);
router.post('/read-all', markAllNotificationsAsRead);
router.post('/:notificationId/read', markNotificationAsRead);

export default router;
