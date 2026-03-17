export function notFound(req, res) {
  res.status(404).json({
    ok: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Route introuvable',
      path: req.originalUrl
    }
  });
}
