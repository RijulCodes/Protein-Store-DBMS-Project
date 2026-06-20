// routes/aiRoutes.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const ac = require('../controllers/aiController');
const { verifyToken, adminOnly } = require('../middleware/auth');
require('dotenv').config();

// Rate limiter: 15 requests per 15 minutes per IP
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15,
  message: { error: 'Too many requests to AI services, please try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Optional authentication middleware to parse JWT tokens for guest/user chat contexts
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
      } catch (err) {
        // Ignore invalid token errors and proceed as guest
      }
    }
  }
  next();
}

// Apply rate limiting to all AI endpoints
router.use(aiLimiter);

router.post('/description', ac.generateDescription);
router.post('/macros',      ac.getMacroAdvice);
router.post('/search',      ac.parseNaturalSearch);
router.post('/chat',        optionalAuth, ac.chatSupport);
router.post('/admin-query', verifyToken, adminOnly, ac.adminQuery);

module.exports = router;
