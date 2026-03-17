import { Router } from 'express';

import { getRooms, getSubjects, listParticipants } from '../controllers/ligue.controller.js';
import { registerToLigue } from '../controllers/ligueRegistration.controller.js';
import { uploadUserPhoto } from '../middlewares/uploadUserPhoto.js';

const router = Router();

router.post('/register', uploadUserPhoto.single('photo'), registerToLigue);

router.get('/rooms', getRooms);
router.get('/rooms/:roomId/subjects', getSubjects);
router.get('/rooms/:roomId/participants', listParticipants);

export default router;
