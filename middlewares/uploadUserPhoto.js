import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'users');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext) ? ext : '';

    const id = req.user?.idUser || req.body?.id_users || req.body?.id_user;
    const safePrefix = id ? String(id).replaceAll(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) : 'user';

    cb(null, `${safePrefix}_${Date.now()}_${crypto.randomUUID()}${safeExt}`);
  }
});

function fileFilter(_req, file, cb) {
  const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
  if (!allowed.has(file.mimetype)) {
    const err = new Error('Type de fichier non supporté (jpeg/png/webp uniquement).');
    err.statusCode = 400;
    err.code = 'UNSUPPORTED_FILE_TYPE';
    return cb(err);
  }

  return cb(null, true);
}

export const uploadUserPhoto = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});
