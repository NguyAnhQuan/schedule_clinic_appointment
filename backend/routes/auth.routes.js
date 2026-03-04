const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middlewares/auth');
const {
  login,
  register,
  getMe,
  updateProfile,
  getMyAppointments,
} = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/register', register);
router.get('/me', authMiddleware, getMe);
router.patch('/me', authMiddleware, updateProfile);
router.get('/my-appointments', authMiddleware, getMyAppointments);

module.exports = router;

