const { pool } = require('../config/db');

exports.listVideos = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, category, tag, sort = 'newest' } = req.query;
        const offset = (page - 1) * limit;
        
        let query = `
            SELECT DISTINCT v.*, u.username as uploader_name, c.name as category_name, c.slug as category_slug
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN video_tags vt ON v.id = vt.video_id
            LEFT JOIN tags t ON vt.tag_id = t.id
            WHERE v.status = 'approved' AND v.is_private = false AND v.is_community = false
        `;
        const params = [];
        let paramIndex = 1;

        if (category) {
            query += ` AND (c.slug = $${paramIndex} OR c.name = $${paramIndex})`;
            params.push(category);
            paramIndex++;
        }

        if (tag) {
            query += ` AND t.name = $${paramIndex}`;
            params.push(tag);
            paramIndex++;
        }

        let orderBy = 'v.created_at DESC';
        switch (sort) {
            case 'popular':
            case 'trending':
                orderBy = 'v.views_count DESC';
                break;
            case 'top_rated':
                orderBy = 'v.likes_count DESC';
                break;
            case 'oldest':
                orderBy = 'v.created_at ASC';
                break;
            case 'newest':
            default:
                orderBy = 'v.created_at DESC';
        }

        query += ` ORDER BY ${orderBy} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.getVideo = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name, u.role as uploader_role, c.name as category_name,
                   COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN video_tags vt ON v.id = vt.video_id
            LEFT JOIN tags t ON vt.tag_id = t.id
            WHERE v.id = $1
            GROUP BY v.id, u.username, u.role, c.name
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const video = result.rows[0];

        // Check community/creator restriction
        if (video.uploader_role === 'creator' && !req.user) {
            return res.status(401).json({ message: 'Please sign up to view community content' });
        }

        // Check privacy
        if (video.is_private) {
            const userId = req.user ? req.user.id : null;
            if (!userId) return res.status(403).json({ message: 'This video is private' });
            
            if (video.uploader_id !== userId) {
                const followCheck = await pool.query(
                    "SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = 'approved'",
                    [userId, video.uploader_id]
                );
                if (followCheck.rows.length === 0 && req.user.role !== 'admin') {
                    return res.status(403).json({ message: 'This video is private. You must follow the creator to view it.' });
                }
            }
        }

        // Increment view count (async)
        pool.query('UPDATE videos SET views_count = views_count + 1 WHERE id = $1', [id]);

        res.json(video);
    } catch (error) {
        next(error);
    }
};

exports.listCategories = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM categories WHERE is_active = true ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

const { generateThumbnail, getVideoMetadata } = require('../utils/videoProcessor');

exports.uploadVideo = async (req, res, next) => {
    try {
        const { title, description, category_id, is_private, is_community } = req.body;
        const userId = req.user.id;
        const file = req.file; // From multer

        console.log('Upload request:', { title, description, category_id, is_private, is_community, file: file ? 'present' : 'missing', userId });

        if (!file) {
            return res.status(400).json({ message: 'No video file provided' });
        }

        if (!title || title.trim() === '') {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Generate thumbnail and get metadata
        let thumbnailFilename = null;
        let duration = 0;
        
        try {
            // Generate thumbnail
            thumbnailFilename = await generateThumbnail(file.path, file.filename, file.destination);
            
            // Get duration
            const metadata = await getVideoMetadata(file.path);
            duration = Math.round(metadata.format.duration || 0);
        } catch (err) {
            console.error('Error processing video:', err);
            // Continue even if processing fails, we can retry later or show placeholder
        }

        // Insert into DB with status 'pending_approval'
        const result = await pool.query(
            'INSERT INTO videos (uploader_id, title, description, video_url, thumbnail_url, duration_seconds, status, category_id, is_private, is_community) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, title, status, created_at, thumbnail_url, duration_seconds, is_private, is_community',
            [
                userId, 
                title, 
                description || '', 
                `/uploads/${file.filename}`, 
                thumbnailFilename ? `/uploads/${thumbnailFilename}` : null,
                duration,
                'pending_approval',
                category_id || null,
                is_private === 'true' || is_private === true,
                is_community === 'true' || is_community === true
            ]
        );

        res.status(201).json({
            message: 'Video uploaded successfully. Pending moderation approval.',
            video: result.rows[0]
        });
    } catch (error) {
        console.error('Upload error:', error);
        next(error);
    }
};

exports.updateVideo = async (req, res, next) => {
    const { id } = req.params;
    const { title, description, category_id, is_private, is_community } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        // Check if user is owner or admin
        const videoCheck = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoCheck.rows.length === 0) return res.status(404).json({ message: 'Video not found' });

        if (videoCheck.rows[0].uploader_id !== userId && userRole !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this video' });
        }

        const result = await pool.query(
            'UPDATE videos SET title = $1, description = $2, category_id = $3, is_private = $4, is_community = $5, updated_at = NOW() WHERE id = $6 RETURNING *',
            [
                title, 
                description, 
                category_id || null, 
                is_private === true || is_private === 'true', 
                is_community === true || is_community === 'true', 
                id
            ]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.updateThumbnail = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const file = req.file;

    if (!file) return res.status(400).json({ message: 'No image file provided' });

    try {
        // Check ownership
        const videoCheck = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoCheck.rows.length === 0) return res.status(404).json({ message: 'Video not found' });
        
        if (videoCheck.rows[0].uploader_id !== userId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const thumbnailUrl = `/uploads/${file.filename}`;
        await pool.query('UPDATE videos SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrl, id]);

        res.json({ message: 'Thumbnail updated', thumbnail_url: thumbnailUrl });
    } catch (error) {
        next(error);
    }
};

exports.rateVideo = async (req, res, next) => {
    const { id } = req.params;
    const { rating } = req.body; // 1 (like) or -1 (dislike)
    const userId = req.user.id;
    const isLike = rating === 1;

    if (![1, -1].includes(rating)) return res.status(400).json({ message: 'Invalid rating' });

    try {
        // Check existing rating
        const existing = await pool.query(
            'SELECT is_like FROM video_ratings WHERE video_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (existing.rows.length > 0) {
            if (existing.rows[0].is_like === isLike) {
                // Remove rating (toggle off)
                await pool.query('DELETE FROM video_ratings WHERE video_id = $1 AND user_id = $2', [id, userId]);
            } else {
                // Update rating
                await pool.query('UPDATE video_ratings SET is_like = $1 WHERE video_id = $2 AND user_id = $3', [isLike, id, userId]);
            }
        } else {
            // Insert new rating
            await pool.query('INSERT INTO video_ratings (video_id, user_id, is_like) VALUES ($1, $2, $3)', [id, userId, isLike]);
        }

        // Recalculate counts
        const counts = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE is_like = true) as likes,
                COUNT(*) FILTER (WHERE is_like = false) as dislikes
            FROM video_ratings WHERE video_id = $1
        `, [id]);

        await pool.query('UPDATE videos SET likes_count = $1, dislikes_count = $2 WHERE id = $3', 
            [counts.rows[0].likes, counts.rows[0].dislikes, id]);

        res.json({ likes: counts.rows[0].likes, dislikes: counts.rows[0].dislikes });
    } catch (error) {
        next(error);
    }
};

exports.flagVideo = async (req, res, next) => {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    try {
        // 1. Insert the flag
        await pool.query(
            "INSERT INTO flags (target_type, target_id, reporter_id, reason, description) VALUES ('video', $1, $2, $3, $4)",
            [id, userId, reason, description]
        );

        // 2. Check auto-unpublish threshold
        const flagCountResult = await pool.query(
            "SELECT COUNT(*) FROM flags WHERE target_type = 'video' AND target_id = $1 AND status = 'pending'",
            [id]
        );
        const flagCount = parseInt(flagCountResult.rows[0].count);

        // Get threshold from settings or default to 3
        const settingsResult = await pool.query(
            "SELECT value FROM system_settings WHERE key = 'auto_unpublish_threshold'"
        );
        const threshold = settingsResult.rows.length > 0 ? parseInt(settingsResult.rows[0].value) : 3;

        if (flagCount >= threshold) {
            await pool.query(
                "UPDATE videos SET status = 'pending_approval', updated_at = NOW() WHERE id = $1",
                [id]
            );
            
            // Log the auto-unpublish
            await pool.query(
                "INSERT INTO audit_logs (action, entity_type, entity_id, details) VALUES ('auto_unpublish', 'video', $1, $2)",
                [id, JSON.stringify({ flag_count: flagCount, threshold: threshold })]
            );
        }

        res.status(201).json({ message: 'Video flagged' });
    } catch (error) {
        next(error);
    }
};

exports.deleteVideo = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const video = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (video.rows.length === 0) return res.status(404).json({ message: 'Video not found' });

        if (video.rows[0].uploader_id !== userId && userRole !== 'admin' && userRole !== 'moderator') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await pool.query('DELETE FROM videos WHERE id = $1', [id]);
        res.json({ message: 'Video deleted' });
    } catch (error) {
        next(error);
    }
};

exports.getCreatorVideos = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            "SELECT v.*, COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags FROM videos v LEFT JOIN video_tags vt ON v.id = vt.video_id LEFT JOIN tags t ON vt.tag_id = t.id WHERE v.uploader_id = $1 GROUP BY v.id ORDER BY v.created_at DESC",
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.updateCreatorVideo = async (req, res, next) => {
    const { id } = req.params;
    const { title, description, is_private, category_id } = req.body;
    const userId = req.user.id;

    try {
        const result = await pool.query(
            'UPDATE videos SET title = COALESCE($1, title), description = COALESCE($2, description), is_private = COALESCE($3, is_private), category_id = COALESCE($4, category_id), updated_at = NOW() WHERE id = $5 AND uploader_id = $6 RETURNING *',
            [title, description, is_private, category_id, id, userId]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Video not found or not authorized' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.getFollowRequests = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(
            "SELECT f.*, u.username, u.avatar_url FROM follows f JOIN users u ON f.follower_id = u.id WHERE f.following_id = $1 AND f.status = 'pending'",
            [userId]
        );
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.processFollowRequest = async (req, res, next) => {
    const { followerId } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const userId = req.user.id;

    try {
        if (status === 'approved') {
            await pool.query(
                "UPDATE follows SET status = 'approved' WHERE follower_id = $1 AND following_id = $2",
                [followerId, userId]
            );
        } else {
            await pool.query(
                "DELETE FROM follows WHERE follower_id = $1 AND following_id = $2",
                [followerId, userId]
            );
        }
        res.json({ message: `Follow request ${status}` });
    } catch (error) {
        next(error);
    }
};

exports.getCommunityVideos = async (req, res, next) => {
    try {
        // Community grid shows videos marked as community
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name 
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            WHERE v.is_community = true AND v.status = 'approved' AND v.is_private = false
            ORDER BY v.created_at DESC LIMIT 50
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Favorites
exports.toggleFavorite = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;

    try {
        const existing = await pool.query('SELECT * FROM favorites WHERE video_id = $1 AND user_id = $2', [id, userId]);
        
        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM favorites WHERE video_id = $1 AND user_id = $2', [id, userId]);
            res.json({ isFavorite: false });
        } else {
            await pool.query('INSERT INTO favorites (video_id, user_id) VALUES ($1, $2)', [id, userId]);
            res.json({ isFavorite: true });
        }
    } catch (error) {
        next(error);
    }
};

exports.getFavorites = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name 
            FROM favorites f
            JOIN videos v ON f.video_id = v.id
            JOIN users u ON v.uploader_id = u.id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC
        `, [userId]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// History
exports.recordHistory = async (req, res, next) => {
    const { id } = req.params;
    const userId = req.user.id;
    
    try {
        // Upsert history
        await pool.query(`
            INSERT INTO watch_history (user_id, video_id, watched_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (user_id, video_id) 
            DO UPDATE SET watched_at = NOW()
        `, [userId, id]);

        // Keep only last 25
        await pool.query(`
            DELETE FROM watch_history 
            WHERE user_id = $1 AND video_id NOT IN (
                SELECT video_id FROM watch_history 
                WHERE user_id = $1 
                ORDER BY watched_at DESC 
                LIMIT 25
            )
        `, [userId]);

        res.json({ message: 'History recorded' });
    } catch (error) {
        next(error);
    }
};

exports.getHistory = async (req, res, next) => {
    const userId = req.user.id;
    try {
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name, wh.watched_at
            FROM watch_history wh
            JOIN videos v ON wh.video_id = v.id
            JOIN users u ON v.uploader_id = u.id
            WHERE wh.user_id = $1
            ORDER BY wh.watched_at DESC
            LIMIT 25
        `, [userId]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.removeFromHistory = async (req, res, next) => {
    const { id } = req.params; // video_id
    const userId = req.user.id;
    try {
        await pool.query('DELETE FROM watch_history WHERE user_id = $1 AND video_id = $2', [userId, id]);
        res.json({ message: 'Removed from history' });
    } catch (error) {
        next(error);
    }
};

exports.clearHistory = async (req, res, next) => {
    const userId = req.user.id;
    try {
        await pool.query('DELETE FROM watch_history WHERE user_id = $1', [userId]);
        res.json({ message: 'History cleared' });
    } catch (error) {
        next(error);
    }
};

// Comments
const BAD_WORDS = ['badword', 'spam', 'offensive']; 
const containsBadWords = (text) => BAD_WORDS.some(word => text.toLowerCase().includes(word));

exports.addComment = async (req, res, next) => {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    if (containsBadWords(content)) {
        return res.status(400).json({ message: 'Comment contains inappropriate language' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO comments (video_id, user_id, content) VALUES ($1, $2, $3) RETURNING *',
            [id, userId, content]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.getComments = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query(`
            SELECT c.*, u.username, u.avatar_url 
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.video_id = $1
            ORDER BY c.created_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.deleteComment = async (req, res, next) => {
    const { commentId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    try {
        const comment = await pool.query('SELECT user_id FROM comments WHERE id = $1', [commentId]);
        if (comment.rows.length === 0) return res.status(404).json({ message: 'Comment not found' });

        if (comment.rows[0].user_id !== userId && userRole !== 'admin' && userRole !== 'moderator') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
        res.json({ message: 'Comment deleted' });
    } catch (error) {
        next(error);
    }
};

// Removal Request
exports.requestRemoval = async (req, res, next) => {
    const { id } = req.params;
    const { reason, description } = req.body;
    const userId = req.user.id;

    try {
        await pool.query(
            'INSERT INTO removal_requests (video_id, requester_id, reason, description) VALUES ($1, $2, $3, $4)',
            [id, userId, reason, description]
        );
        res.status(201).json({ message: 'Removal request submitted' });
    } catch (error) {
        next(error);
    }
};
