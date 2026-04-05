import { Router } from 'express';

import {
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  registerDevice,
  unregisterDevice,
} from '../controllers/notifications.controller.js';

const router = Router();

router.get('/', listNotifications);
router.post('/devices/register', registerDevice);
router.post('/devices/unregister', unregisterDevice);
router.post('/read-all', markAllNotificationsAsRead);
router.post('/:notificationId/read', markNotificationAsRead);

export default router;