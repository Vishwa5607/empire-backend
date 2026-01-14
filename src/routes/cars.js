const express = require('express');
const router = express.Router();
const pool = require('../config/database');  // ← FIXED
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const storageService = require('../../services/supabaseStorage');  // ← FIXED

console.log('🚗 Cars routes loaded');

// ===============================================
// CAR CRUD ENDPOINTS
// ===============================================

// GET all cars without auth
router.get('/', async (req, res) => {  
  try {
    const result = await pool.query(
      `SELECT c.*, u.username
       FROM cars c
       JOIN users u ON c.user_id = u.id
       ORDER BY c.created_at DESC`
    );

    res.json({
      success: true,
      cars: result.rows,
    });
  } catch (error) {
    console.error('❌ Error fetching cars:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cars',
      error: error.message,
    });
  }
});

// POST create new car
router.post('/', async (req, res) => {
  const { make, model, year, color, horsepower, stage, user_id } = req.body;

  if (!make || !model || !year) {
    return res.status(400).json({
      success: false,
      message: 'Make, model, and year are required',
    });
  }

  // Use user_id from request body, or from token if authenticated
  let userId = user_id;
  
  // If no user_id provided, try to get from auth token
  if (!userId) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        console.log('⚠️ Invalid token, creating car without user association');
      }
    }
  }

  // If still no userId, return error
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: 'User ID required (login or provide user_id)',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO cars (user_id, make, model, year, color, horsepower, stage)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, make, model, year, color || null, horsepower || null, stage || null]
    );

    console.log('✅ Car created:', result.rows[0]);

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: result. rows[0],
    });
  } catch (error) {
    console.error('❌ Error creating car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create car',
      error: error.message,
    });
  }
});

// ===============================================
// IMAGE UPLOAD ENDPOINTS (BEFORE /:id routes!)
// ===============================================

console.log('📸 Registering image upload route:  POST /:id/images');

// POST upload car image
router.post('/:id/images', authenticateToken, upload.single('image'), async (req, res) => {
  const { id } = req. params;
  const { is_primary } = req.body;

  console.log('📸 Image upload request received');
  console.log('   Car ID:', id);
  console.log('   User ID:', req.user.userId);
  console.log('   Is Primary:', is_primary);

  try {
    // Verify car belongs to user
    const carResult = await pool.query(
      'SELECT * FROM cars WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (carResult.rows.length === 0) {
      return res. status(404).json({
        success: false,
        message:  'Car not found or unauthorized',
      });
    }

    if (! req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    console.log('📤 Uploading image for car:', id);
    console.log('📁 File size:', req.file. size, 'bytes');
    console.log('📁 File type:', req.file.mimetype);

    // Upload to Supabase
    const imageUrl = await storageService.uploadImage(
      req.file.buffer,
      'car-image',
      `user_${req.user.userId}/car_${id}`
    );

    // Update car's main image if primary
    if (is_primary === 'true' || is_primary === true) {
      const oldCar = carResult.rows[0];
      if (oldCar.image_url) {
        try {
          await storageService.deleteImage(oldCar.image_url, 'car-image');
        } catch (err) {
          console.log('⚠️ Could not delete old image');
        }
      }

      await pool.query(
        'UPDATE cars SET image_url = $1, updated_at = NOW() WHERE id = $2',
        [imageUrl, id]
      );
    }

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      image_url: imageUrl,
    });
  } catch (error) {
    console.error('❌ Error uploading car image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message,
    });
  }
});

// DELETE car image
router.delete('/:id/image', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const carResult = await pool. query(
      'SELECT * FROM cars WHERE id = $1 AND user_id = $2',
      [id, req.user. userId]
    );

    if (carResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized',
      });
    }

    const car = carResult.rows[0];

    if (!car.image_url) {
      return res.status(400).json({
        success: false,
        message: 'No image to delete',
      });
    }

    await storageService.deleteImage(car.image_url, 'car-image');

    await pool.query(
      'UPDATE cars SET image_url = NULL, updated_at = NOW() WHERE id = $1',
      [id]
    );

    res.json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting car image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
    });
  }
});

// ===============================================
// GENERIC /: id ROUTES (MUST BE LAST!)
// ===============================================

// GET single car by ID
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT c.*, u.username
       FROM cars c
       JOIN users u ON c.user_id = u.id
       WHERE c. id = $1`,
      [id]
    );

    if (result.rows. length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found',
      });
    }

    res.json({
      success: true,
      car: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error fetching car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car',
    });
  }
});

// PUT update car
router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { make, model, year, color, horsepower, stage } = req.body;

  try {
    const ownerCheck = await pool.query(
      'SELECT * FROM cars WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (ownerCheck.rows. length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized',
      });
    }

    const result = await pool.query(
      `UPDATE cars SET
        make = COALESCE($1, make),
        model = COALESCE($2, model),
        year = COALESCE($3, year),
        color = COALESCE($4, color),
        horsepower = COALESCE($5, horsepower),
        stage = COALESCE($6, stage),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *`,
      [make, model, year, color, horsepower, stage, id]
    );

    res.json({
      success: true,
      message: 'Car updated successfully',
      data: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error updating car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car',
      error:  error.message,
    });
  }
});

// DELETE car
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const carResult = await pool.query(
      'SELECT * FROM cars WHERE id = $1 AND user_id = $2',
      [id, req.user.userId]
    );

    if (carResult. rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized',
      });
    }

    const car = carResult.rows[0];

    // Delete image from storage if exists
    if (car.image_url) {
      try {
        await storageService. deleteImage(car.image_url, 'car-image');
      } catch (err) {
        console.log('⚠️ Could not delete car image from storage');
      }
    }

    await pool.query('DELETE FROM cars WHERE id = $1', [id]);

    console.log('✅ Car deleted:', id);

    res.json({
      success: true,
      message: 'Car deleted successfully',
    });
  } catch (error) {
    console.error('❌ Error deleting car:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car',
      error: error.message,
    });
  }
});

module.exports = router;
