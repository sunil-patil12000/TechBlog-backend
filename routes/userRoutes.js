const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const { login, getMe } = require('../controllers/authController');
const { 
  registerUser,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser 
} = require('../controllers/userController');

// Auth routes
router.post('/login', login);
router.get('/me', protect, getMe);

// Public routes
router.post('/register', registerUser);

// Protected routes
router.route('/profile')
  .put(protect, updateProfile);

// Admin routes
router.use(protect, authorize('admin'));

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
