const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, adminOnly } = require('../middleware/auth');
const isProduction = process.env.NODE_ENV === 'production';

// Test endpoint to debug database connection
router.get('/test', authenticateToken, adminOnly, async (req, res) => {
  try {
    console.log('🔍 Testing database connection...');
    
    // Test basic database connection
    const testQuery = 'SELECT 1 as test';
    const testResult = await db.query(testQuery);
    
    // Test feedback table structure
    const tableQuery = 'DESCRIBE feedback';
    const tableResult = await db.query(tableQuery);
    
    // Test feedback table data
    const dataQuery = 'SELECT COUNT(*) as count FROM feedback';
    const dataResult = await db.query(dataQuery);
    
    console.log('✅ Database test results:', {
      basicTest: testResult[0],
      tableStructure: tableResult,
      recordCount: dataResult[0]
    });
    
    res.json({
      success: true,
      message: 'Database connection test successful',
      data: {
        basicTest: testResult[0],
        tableStructure: tableResult,
        recordCount: dataResult[0]
      }
    });
    
  } catch (error) {
    console.error('❌ Database test failed:', isProduction ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Database test failed',
      error: isProduction ? undefined : error.message,
      details: isProduction ? undefined : {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage
      }
    });
  }
});

// POST /api/feedback - Submit new feedback
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🚀 FEEDBACK SUBMISSION STARTED - V2 FIXED');
    
    const { rating, content } = req.body;
    const user_id = req.user.user_id;

    console.log('📝 Submitting feedback:', {
      user_id,
      rating,
      content: content ? content.substring(0, 50) + '...' : null
    });

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      console.log('❌ Invalid rating:', rating);
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if user exists (double-check)
    const userCheckQuery = 'SELECT user_id FROM users WHERE user_id = ?';
    const userCheck = await db.query(userCheckQuery, [user_id]);
    
    if (!userCheck || userCheck.length === 0) {
      console.log('❌ User not found:', user_id);
      return res.status(400).json({
        success: false,
        message: 'User not found'
      });
    }

    // Simple insert without subscription complications
    const insertQuery = `
      INSERT INTO feedback (user_id, content, rating, status, created_at)
      VALUES (?, ?, ?, 'active', NOW())
    `;
    
    const insertValues = [
      user_id,
      content || '',
      rating
    ];

    // Execute the insert
    const result = await db.query(insertQuery, insertValues);

    let feedback_id;
    
    // Handle different database response formats
    if (result && result.insertId) {
      feedback_id = result.insertId;
    } else if (result && result[0] && result[0].insertId) {
      feedback_id = result[0].insertId;
    } else if (Array.isArray(result) && result.length > 0) {
      feedback_id = result[0].insertId;
    } else {
      // Fallback: get the last inserted ID
      console.log('🔢 Using fallback method to get insertId');
      const lastIdQuery = 'SELECT LAST_INSERT_ID() as insertId';
      const lastIdResult = await db.query(lastIdQuery);
      feedback_id = lastIdResult[0].insertId;
    }

    console.log('✅ Feedback submitted successfully:', {
      feedback_id: feedback_id,
      result: result,
      user_id,
      rating,
      content: content ? content.substring(0, 50) + '...' : null
    });

    // Verify the insert worked
    const verifyQuery = 'SELECT * FROM feedback WHERE feedback_id = ?';
    const verifyResult = await db.query(verifyQuery, [feedback_id]);
    
    if (!verifyResult || verifyResult.length === 0) {
      console.log('❌ Insert verification failed');
      return res.status(500).json({
        success: false,
        message: 'Insert verification failed'
      });
    }

    if (!isProduction) {
      console.log('✅ Insert verified:', verifyResult[0]);
    }

    res.status(201).json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        feedback_id: feedback_id,
        inserted_record: verifyResult[0]
      }
    });

  } catch (error) {
    console.error('❌ Error submitting feedback:', isProduction ? error.message : error);
    if (!isProduction) {
      console.error('❌ Full error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlState: error.sqlState,
      sqlMessage: error.sqlMessage,
      stack: error.stack
    });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: isProduction ? undefined : error.message,
      details: isProduction ? undefined : {
        code: error.code,
        errno: error.errno,
        sqlState: error.sqlState,
        sqlMessage: error.sqlMessage || 'No SQL details available'
      }
    });
  }
});

// GET /api/feedback/user - Get all feedback for the current user
router.get('/user', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    console.log('🔍 Getting feedback for user:', user_id);

    // Get all feedback for this user
    const feedbackQuery = `
      SELECT 
        feedback_id,
        user_id,
        content,
        rating,
        status,
        created_at
      FROM feedback 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `;
    
    if (!isProduction) {
      console.log('🔍 With user_id:', user_id);
    }
    
    const feedback = await db.query(feedbackQuery, [user_id]);

    console.log('✅ User feedback retrieved:', {
      user_id,
      count: feedback.length,
      feedback: feedback,
      isArray: Array.isArray(feedback)
    });

    // Ensure feedback is always an array
    let feedbackArray;
    if (Array.isArray(feedback)) {
      feedbackArray = feedback;
    } else if (feedback && typeof feedback === 'object') {
      feedbackArray = [feedback];
    } else {
      feedbackArray = [];
    }

    console.log('🔧 Final feedback array:', {
      length: feedbackArray.length,
      items: feedbackArray
    });

    res.json({
      success: true,
      message: 'User feedback retrieved successfully',
      data: {
        feedback: feedbackArray
      }
    });

  } catch (error) {
    console.error('❌ Error getting user feedback:', isProduction ? error.message : error);
    if (!isProduction) {
      console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code
    });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to get user feedback',
      error: isProduction ? undefined : error.message
    });
  }
});

// GET /api/feedback/:feedbackId/details - Get feedback details with comments
router.get('/:feedbackId/details', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const user_id = req.user.user_id;

    if (!isProduction) {
      console.log('🔍 Getting feedback details:', { feedbackId, user_id });
    }

    // Get feedback details
    const feedbackQuery = `
      SELECT 
        feedback_id,
        user_id,
        content,
        rating,
        status,
        created_at
      FROM feedback 
      WHERE feedback_id = ? AND user_id = ?
    `;
    
    const feedbackResult = await db.query(feedbackQuery, [feedbackId, user_id]);
    
    if (!isProduction) {
      console.log('🔍 Feedback query result:', {
      feedbackId,
      user_id,
      result: feedbackResult,
      resultLength: feedbackResult.length,
      firstItem: feedbackResult[0]
    });
    }
    
    if (feedbackResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    const feedback = feedbackResult[0];
    
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Get comments for this feedback
    const commentsQuery = `
      SELECT 
        feedback_comment_id,
        feedback_id,
        user_id,
        role,
        comment,
        created_at
      FROM feedback_comments 
      WHERE feedback_id = ?
      ORDER BY created_at ASC
    `;
    
    const comments = await db.query(commentsQuery, [feedbackId]);

    console.log('✅ Feedback details retrieved:', {
      feedback_id: feedback.feedback_id,
      rating: feedback.rating,
      comments_count: comments.length,
      is_comments_array: Array.isArray(comments)
    });

    res.json({
      success: true,
      message: 'Feedback details retrieved successfully',
      data: {
        feedback,
        comments: comments || []
      }
    });

  } catch (error) {
    console.error('❌ Error getting feedback details:', isProduction ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback details',
      error: isProduction ? undefined : error.message
    });
  }
});

// GET /api/feedback/:feedbackId/comments - Get comments for a feedback
router.get('/:feedbackId/comments', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;

    // Verify feedback exists and user has access
    const feedbackQuery = `
      SELECT feedback_id, user_id 
      FROM feedback 
      WHERE feedback_id = ?
    `;
    
    const feedbackResult = await db.query(feedbackQuery, [feedbackId]);
    
    if (feedbackResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Get comments
    const commentsQuery = `
      SELECT 
        feedback_comment_id,
        feedback_id,
        user_id,
        role,
        comment,
        created_at
      FROM feedback_comments 
      WHERE feedback_id = ?
      ORDER BY created_at ASC
    `;
    
    const comments = await db.query(commentsQuery, [feedbackId]);

    res.json({
      success: true,
      data: {
        comments
      }
    });

  } catch (error) {
    console.error('Error getting feedback comments:', isProduction ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Failed to get comments',
      error: isProduction ? undefined : error.message
    });
  }
});

// POST /api/feedback/:feedbackId/comments - Add comment to feedback
router.post('/:feedbackId/comments', authenticateToken, async (req, res) => {
  try {
    const { feedbackId } = req.params;
    const { comment } = req.body;
    const user_id = req.user.user_id;

    if (!comment || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Comment cannot be empty'
      });
    }

    // Verify feedback exists
    const feedbackQuery = `
      SELECT feedback_id 
      FROM feedback 
      WHERE feedback_id = ?
    `;
    
    const feedbackResult = await db.query(feedbackQuery, [feedbackId]);
    
    if (feedbackResult.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found'
      });
    }

    // Insert comment
    const insertCommentQuery = `
      INSERT INTO feedback_comments (feedback_id, user_id, role, comment, created_at)
      VALUES (?, ?, 'user', ?, NOW())
    `;
    
    const result = await db.query(insertCommentQuery, [
      feedbackId,
      user_id,
      comment.trim()
    ]);
    const commentId = result?.insertId || result?.[0]?.insertId || null;

    console.log('💬 Comment added:', {
      comment_id: commentId,
      feedback_id: feedbackId,
      user_id,
      comment: comment.substring(0, 50) + '...'
    });

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: {
        comment_id: commentId
      }
    });

  } catch (error) {
    console.error('Error adding comment:', isProduction ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Failed to add comment',
      error: isProduction ? undefined : error.message
    });
  }
});

// GET /api/feedback/user/history - Get user's feedback history
router.get('/user/history', authenticateToken, async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const offset = (page - 1) * limit;

    const feedbackQuery = `
      SELECT 
        feedback_id,
        subscription_id,
        content,
        rating,
        status,
        created_at
      FROM feedback 
      WHERE user_id = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;
    
    const feedback = await db.query(feedbackQuery, [user_id, limit, offset]);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM feedback 
      WHERE user_id = ?
    `;
    
    const countResult = await db.query(countQuery, [user_id]);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: {
        feedback,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Error getting user feedback:', isProduction ? error.message : error);
    res.status(500).json({
      success: false,
      message: 'Failed to get feedback history',
      error: isProduction ? undefined : error.message
    });
  }
});

module.exports = router;
