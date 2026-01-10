const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

exports.register = async (req, res) => {
  try {
    const { email, password, username, full_name } = req.body;

    // Check if user exists - FIXED ✅
    const existing = await db.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email or username already exists'
      });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user - FIXED ✅
    const result = await db.query(
      'INSERT INTO users (email, password_hash, username, full_name) VALUES ($1, $2, $3, $4) RETURNING *',
      [email, password_hash, username, full_name]
    );

    const newUser = result.rows[0];

    // Generate token
    const token = jwt.sign(
      { userId: newUser. id, email: newUser.email, username: newUser.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token:  token,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        fullName: newUser.full_name
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error. message
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Get user - FIXED ✅
    const users = await db.query(
      'SELECT id, email, username, password_hash, full_name, profile_image_url FROM users WHERE email = $1',
      [email]
    );

    if (users.rows.length === 0) {
      return res. status(401).json({
        success: false,
        message:  'Invalid credentials'
      });
    }

    const user = users.rows[0];

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, username: user. username },
      process.env. JWT_SECRET,
      { expiresIn: process.env. JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token: token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        fullName: user.full_name,
        profileImageUrl: user.profile_image_url
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};