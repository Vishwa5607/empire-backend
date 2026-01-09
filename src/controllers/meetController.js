const db = require('../config/database');

exports.getAllMeets = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT m.*, u.username as organizer_name, u.profile_image_url as organizer_image,
             COUNT(DISTINCT ma.id) as attendee_count
      FROM meets m
      JOIN users u ON m.organizer_id = u.id
      LEFT JOIN meet_attendees ma ON m.id = ma.meet_id AND ma.status = 'attending'
      WHERE m.status != 'cancelled'
      GROUP BY m.id, u.username, u.profile_image_url
      ORDER BY m.meet_date ASC
    `);

    res.json({
      success: true,
      data: result.rows
    });
  } catch (error) {
    console.error('Get meets error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meets',
      error: error.message
    });
  }
};

exports.getMeetById = async (req, res) => {
  try {
    const meetResult = await db.query(`
      SELECT m.*, u.username as organizer_name, u.profile_image_url as organizer_image,
             COUNT(DISTINCT ma.id) as attendee_count
      FROM meets m
      JOIN users u ON m.organizer_id = u.id
      LEFT JOIN meet_attendees ma ON m.id = ma.meet_id AND ma.status = 'attending'
      WHERE m.id = $1
      GROUP BY m.id, u.username, u.profile_image_url
    `, [req.params.id]);

    if (meetResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Meet not found'
      });
    }

    // Get attendees
    const attendeesResult = await db.query(`
      SELECT ma.*, u.username, u.profile_image_url, c.make, c.model, c.year
      FROM meet_attendees ma
      JOIN users u ON ma.user_id = u.id
      LEFT JOIN cars c ON ma.car_id = c.id
      WHERE ma.meet_id = $1 AND ma.status = 'attending'
    `, [req.params.id]);

    res.json({
      success: true,
      data: {
        ...meetResult.rows[0],
        attendees: attendeesResult.rows
      }
    });
  } catch (error) {
    console.error('Get meet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch meet',
      error: error.message
    });
  }
};

exports.createMeet = async (req, res) => {
  try {
    const { title, description, location, latitude, longitude, meet_date, max_attendees, image_url } = req.body;
    const userId = req.user.userId;

    const result = await db.query(
      `INSERT INTO meets (organizer_id, title, description, location, latitude, longitude, meet_date, max_attendees, image_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [userId, title, description, location, latitude, longitude, meet_date, max_attendees, image_url]
    );

    res.status(201).json({
      success: true,
      message: 'Meet created successfully',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create meet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create meet',
      error: error.message
    });
  }
};

exports.joinMeet = async (req, res) => {
  try {
    const meetId = req.params.id;
    const userId = req.user.userId;
    const { car_id, status = 'attending' } = req.body;

    // Check if already joined
    const existingResult = await db.query(
      'SELECT id FROM meet_attendees WHERE meet_id = $1 AND user_id = $2',
      [meetId, userId]
    );

    if (existingResult.rows.length > 0) {
      // Update status
      await db.query(
        'UPDATE meet_attendees SET status = $1, car_id = $2 WHERE meet_id = $3 AND user_id = $4',
        [status, car_id, meetId, userId]
      );
    } else {
      // Insert new
      await db.query(
        'INSERT INTO meet_attendees (meet_id, user_id, car_id, status) VALUES ($1, $2, $3, $4)',
        [meetId, userId, car_id, status]
      );

      // Update user stats if attending
      if (status === 'attending') {
        await db.query(
          'UPDATE profile_stats SET meets_attended = meets_attended + 1 WHERE user_id = $1',
          [userId]
        );
      }
    }

    res.json({
      success: true,
      message: 'Meet status updated successfully'
    });
  } catch (error) {
    console.error('Join meet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join meet',
      error: error.message
    });
  }
};

exports.leaveMeet = async (req, res) => {
  try {
    const meetId = req.params.id;
    const userId = req.user.userId;

    await db.query(
      'DELETE FROM meet_attendees WHERE meet_id = $1 AND user_id = $2',
      [meetId, userId]
    );

    res.json({
      success: true,
      message: 'Left meet successfully'
    });
  } catch (error) {
    console.error('Leave meet error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave meet',
      error: error.message
    });
  }
};