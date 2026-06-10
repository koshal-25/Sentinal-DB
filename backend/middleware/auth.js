const jwt = require('jsonwebtoken');
const SECRET = process.env.JWT_SECRET || 'sentinel_dev_secret_change_in_prod';

function authenticate(req, res, next) {
  const header = req.headers['authorization'];
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });

  const token = header.split(' ')[1];
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!allowedRoles.includes(req.user?.role))
      return res.status(403).json({ error: 'Access denied for your role' });
    next();
  };
}

module.exports = { authenticate, authorize };
