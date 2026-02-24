export const isAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Unauthorized' });
};

export const optionalAuth = (req, res, next) => {
  // Continue regardless of auth status
  next();
};
