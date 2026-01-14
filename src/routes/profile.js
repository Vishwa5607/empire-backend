const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const upload = require('../middleware/upload');
const storageService = require('../../services/supabaseStorage');

// GET user profile
router.get('/', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, username, email, full_name, bio, profile_image_url, 
              phone, location, instagram_handle, member_since, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return res. status(404).json({
        success: false,
        message:  'User not found',
      });
    }

    res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error fetching profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch profile',
    });
  }
});

// PUT update user profile
router.put('/', authenticateToken, async (req, res) => {
  const { full_name, bio, phone, location, instagram_handle } = req.body;

  try {
    const result = await pool. query(
      `UPDATE users 
       SET full_name = COALESCE($1, full_name),
           bio = COALESCE($2, bio),
           phone = COALESCE($3, phone),
           location = COALESCE($4, location),
           instagram_handle = COALESCE($5, instagram_handle),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, username, email, full_name, bio, profile_image_url, 
                 phone, location, instagram_handle, member_since`,
      [full_name, bio, phone, location, instagram_handle, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: result.rows[0],
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile',
    });
  }
});

// POST upload profile image
router.post('/image', authenticateToken, upload. single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    // Delete old profile image if exists
    const userResult = await pool.query(
      'SELECT profile_image_url FROM users WHERE id = $1',
      [req.user.userId]
    );

    if (userResult.rows[0].profile_image_url) {
      try {
        await storageService.deleteImage(
          userResult.rows[0]. profile_image_url,
          'profile-images'
        );
      } catch (err) {
        console.log('⚠️ Could not delete old profile image');
      }
    }

    // Upload new image
    const imageUrl = await storageService.uploadImage(
      req.file.buffer,
      'profile-images',
      `user_${req.user.userId}`
    );

    // Update database
    const result = await pool.query(
      'UPDATE users SET profile_image_url = $1, updated_at = NOW() WHERE id = $2 RETURNING profile_image_url',
      [imageUrl, req.user.userId]
    );

    res.json({
      success: true,
      message: 'Profile image uploaded successfully',
      profile_image_url: result.rows[0].profile_image_url,
    });
  } catch (error) {
    console.error('❌ Error uploading profile image:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload profile image',
    });
  }
});

module.exports = router;