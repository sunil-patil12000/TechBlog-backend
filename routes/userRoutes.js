const express = require('express');
const router = express.Router();
const { protect, admin } = require('../middlewares/authMiddleware');
const { login, getMe } = require('../controllers/authController');
const { 
  registerUser,
  updateProfile,
  getUsers,
  getUserById,
  updateUser,
  deleteUser 
} = require('../controllers/userController');

// Public routes
router.post('/login', login);
router.post('/register', registerUser);

// Protected routes
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

// Admin routes
router.use(protect, admin);

router.route('/')
  .get(getUsers);

router.route('/:id')
  .get(getUserById)
  .put(updateUser)
  .delete(deleteUser);

module.exports = router;
