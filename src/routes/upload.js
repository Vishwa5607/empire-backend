const express = require('express');
const router = express.Router();
const multer = require('multer');
const supabase = require('../config/supabase');
const { authenticateToken } = require('../middleware/auth');
const pool = require('../config/database');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize:  5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow images
    if (file.mimetype. startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// POST /api/cars/: id/images - Upload car image
router.post('/: id/images', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    const carId = parseInt(req.params.id);
    const userId = req.user. userId;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Verify car belongs to user
    const carCheck = await pool.query(
      'SELECT id FROM cars WHERE id = $1 AND user_id = $2',
      [carId, userId]
    );

    if (carCheck.rows. length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized',
      });
    }

    // Generate unique filename
    const fileExt = req.file.mimetype.split('/')[1];
    const fileName = `car-${carId}-${Date.now()}.${fileExt}`;
    const filePath = `cars/${userId}/${fileName}`;

    console.log(`📸 Uploading image:  ${filePath}`);

    // Upload to Supabase Storage
    const { data: uploadData, error:  uploadError } = await supabase. storage
      .from('car-images') // Your bucket name
      .upload(filePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    if (uploadError) {
      console.error('❌ Supabase upload error:', uploadError);
      return res.status(500).json({
        success: false,
        message: 'Failed to upload image',
      });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('car-images')
      .getPublicUrl(filePath);

    const imageUrl = urlData.publicUrl;

    console.log(`✅ Image uploaded:  ${imageUrl}`);

    // Update car record with image URL
    await pool.query(
      'UPDATE cars SET image_url = $1 WHERE id = $2',
      [imageUrl, carId]
    );

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      image_url: imageUrl,
    });
  } catch (error) {
    console.error('❌ Upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image',
    });
  }
});

module.exports = router;