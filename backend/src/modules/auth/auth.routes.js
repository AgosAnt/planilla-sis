const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const authenticate = require('../../middlewares/auth.middleware');

// GET /api/v1/me
router.get('/me', authenticate, (req, res, next) => authController.me(req, res, next));

// POST /api/v1/auth/logout
router.post('/auth/logout', authenticate, (req, res, next) => authController.logout(req, res, next));

module.exports = router;