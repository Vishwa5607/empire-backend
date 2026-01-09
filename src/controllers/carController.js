const db = require('../config/database');

exports.getAllCars = async (req, res) => {
  try {
    const [cars] = await db.query(`
      SELECT c.*, u.username, u.profile_image_url as owner_image
      FROM cars c
      JOIN users u ON c.user_id = u.id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error('Get cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cars',
      error: error.message
    });
  }
};

exports.getUserCars = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.userId;

    const [cars] = await db.query(
      'SELECT * FROM cars WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      data: cars
    });
  } catch (error) {
    console.error('Get user cars error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user cars',
      error: error.message
    });
  }
};

exports.getCarById = async (req, res) => {
  try {
    const [cars] = await db.query(`
      SELECT c.*, u.username, u.profile_image_url as owner_image
      FROM cars c
      JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [req.params.id]);

    if (cars.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.json({
      success: true,
      data: cars[0]
    });
  } catch (error) {
    console.error('Get car error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch car',
      error: error.message
    });
  }
};

exports.createCar = async (req, res) => {
  try {
    const { make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications } = req.body;
    const userId = req.user.userId;

    const [result] = await db.query(
      `INSERT INTO cars (user_id, make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications]
    );

    // Update user stats
    await db.query(
      'UPDATE profile_stats SET cars_owned = cars_owned + 1 WHERE user_id = ?',
      [userId]
    );

    const [newCar] = await db.query('SELECT * FROM cars WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: newCar[0]
    });
  } catch (error) {
    console.error('Create car error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add car',
      error: error.message
    });
  }
};

exports.updateCar = async (req, res) => {
  try {
    const carId = req.params.id;
    const userId = req.user.userId;
    const updates = req.body;

    // Check ownership
    const [cars] = await db.query('SELECT user_id FROM cars WHERE id = ?', [carId]);
    if (cars.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    if (cars[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const fields = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(updates), carId];

    await db.query(`UPDATE cars SET ${fields} WHERE id = ?`, values);

    const [updated] = await db.query('SELECT * FROM cars WHERE id = ?', [carId]);

    res.json({
      success: true,
      message: 'Car updated successfully',
      data: updated[0]
    });
  } catch (error) {
    console.error('Update car error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update car',
      error: error.message
    });
  }
};

exports.deleteCar = async (req, res) => {
  try {
    const carId = req.params.id;
    const userId = req.user.userId;

    // Check ownership
    const [cars] = await db.query('SELECT user_id FROM cars WHERE id = ?', [carId]);
    if (cars.length === 0) {
      return res.status(404).json({ success: false, message: 'Car not found' });
    }
    if (cars[0].user_id !== userId) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await db.query('DELETE FROM cars WHERE id = ?', [carId]);

    // Update user stats
    await db.query(
      'UPDATE profile_stats SET cars_owned = GREATEST(cars_owned - 1, 0) WHERE user_id = ?',
      [userId]
    );

    res.json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car',
      error: error.message
    });
  }
};