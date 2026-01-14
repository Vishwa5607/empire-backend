const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Controllers (for auth and meets only)
const authController = require('../controllers/authController');
const meetController = require('../controllers/meetController');

// Route files (for cars and profile)
const carRoutes = require('./cars');  // ← This loads src/routes/cars.js with image endpoints! 
const profileRoutes = require('./profile');

// ===============================================
// AUTH ROUTES (using controller)
// ===============================================
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// ===============================================
// CAR ROUTES (using routes file - includes image upload!)
// ===============================================
router.use('/cars', carRoutes);  // ← This mounts ALL routes from src/routes/cars.js

// ===============================================
// PROFILE ROUTES
// ===============================================
router.use('/profile', profileRoutes);

// ===============================================
// MEET ROUTES (using controller)
// ===============================================
router.get('/meets', meetController.getAllMeets);
router.get('/meets/:id', meetController.getMeetById);
router.post('/meets', authMiddleware, meetController.createMeet);
router.post('/meets/:id/join', authMiddleware, meetController.joinMeet);
router.delete('/meets/:id/leave', authMiddleware, meetController.leaveMeet);

// ===============================================
// HEALTH CHECK
// ===============================================
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Empire API is running',
    timestamp:  new Date().toISOString()
  });
});

module.exports = router;
