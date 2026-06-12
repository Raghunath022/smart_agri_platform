// Authentication & Role Management Service
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'agri_ai_saas_super_secret_key_123';

/**
 * Creates a JWT token for a user.
 */
function createToken(user) {
  return jwt.sign(
    { 
      id: user.id || user._id, 
      email: user.email, 
      role: user.role || 'farmer',
      name: user.name
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

/**
 * Express middleware to authenticate API requests.
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer <token>

  if (!token) {
    return res.status(401).json({ error: 'Access token missing' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = decoded;
    next();
  });
}

/**
 * Middleware constructor to restrict routes by role.
 */
function requireRole(allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permission denied for this user role' });
    }
    next();
  };
}

module.exports = {
  createToken,
  authenticateToken,
  requireRole,
  JWT_SECRET
};
