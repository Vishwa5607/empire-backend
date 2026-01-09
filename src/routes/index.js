const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const carController = require('../controllers/carController');
const meetController = require('../controllers/meetController');

// Auth routes (public)
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// Car routes
router.get('/cars', carController.getAllCars);
router.get('/cars/:id', carController.getCarById);
router.get('/users/:userId/cars', carController.getUserCars);
router.post('/cars', authMiddleware, carController.createCar);
router.put('/cars/:id', authMiddleware, carController.updateCar);
router.delete('/cars/:id', authMiddleware, carController.deleteCar);

// Meet routes
router.get('/meets', meetController.getAllMeets);
router.get('/meets/:id', meetController.getMeetById);
router.post('/meets', authMiddleware, meetController.createMeet);
router.post('/meets/:id/join', authMiddleware, meetController.joinMeet);
router.delete('/meets/:id/leave', authMiddleware, meetController.leaveMeet);

// Health check
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Empire API is running',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;