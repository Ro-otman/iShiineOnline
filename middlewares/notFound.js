export function notFound(req, _res, next) {
  const err = new Error('Route introuvable');
  err.statusCode = 404;
  err.code = 'NOT_FOUND';
  err.details = { path: req.originalUrl };
  next(err);
}
