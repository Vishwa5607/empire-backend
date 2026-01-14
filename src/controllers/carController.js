const db = require('../config/database');

exports.getAllCars = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT c.*, u. username, u.profile_image_url as owner_image
      FROM cars c
      JOIN users u ON c.user_id = u. id
      ORDER BY c.created_at DESC
    `);

    res.json({
      success: true,
      cars: result.rows  
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
    const userId = req.params. userId || req.user.userId;

    const result = await db.query(
      'SELECT * FROM cars WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    res.json({
      success: true,
      cars: result.rows  // ✅ Changed
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
    const result = await db.query(`
      SELECT c.*, u.username, u.profile_image_url as owner_image
      FROM cars c
      JOIN users u ON c. user_id = u.id
      WHERE c.id = $1
    `, [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found'
      });
    }

    res.json({
      success: true,
      car: result.rows[0]  // ✅ Changed
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

    const result = await db.query(
      `INSERT INTO cars (user_id, make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [userId, make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications]        
    );

    res.status(201).json({
      success: true,
      message: 'Car added successfully',
      data: result.rows[0]  
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
    const { make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications } = req.body;

    const result = await db.query(
      `UPDATE cars 
       SET make = $1, model = $2, year = $3, color = $4, vin = $5, 
           license_plate = $6, image_url = $7, stage = $8, 
           horsepower = $9, torque = $10, modifications = $11
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [make, model, year, color, vin, license_plate, image_url, stage, horsepower, torque, modifications, carId, req.user.userId]
    );

    if (result.rows. length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Car updated successfully',
      car: result.rows[0]
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

    const result = await db.query(
      'DELETE FROM cars WHERE id = $1 AND user_id = $2 RETURNING *',
      [carId, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Car not found or unauthorized'
      });
    }

    res.json({
      success: true,
      message: 'Car deleted successfully'
    });
  } catch (error) {
    console.error('Delete car error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete car',
      error:  error.message
    });
  }
};