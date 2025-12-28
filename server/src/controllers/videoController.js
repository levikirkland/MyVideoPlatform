const { pool } = require('../config/db');
const membershipService = require('../services/membershipService');

const STAFF_ROLES = new Set(['admin', 'moderator']);
const VALID_ACCESS_MODES = new Set(['public', 'paidfans', 'username_only']);

let videoAccessTableExists = null;
const checkVideoAccessAvailability = async () => {
    if (videoAccessTableExists !== null) {
        return videoAccessTableExists;
    }

    try {
        const result = await pool.query("SELECT to_regclass('public.video_access') as name");
        videoAccessTableExists = Boolean(result.rows[0]?.name);
    } catch (error) {
        console.error('Unable to verify video_access table:', error);
        videoAccessTableExists = false;
    }

    return videoAccessTableExists;
};

const ensureVideoAccessEnabled = async (res) => {
    const ready = await checkVideoAccessAvailability();
    if (!ready) {
        res.status(501).json({
            message: 'Video access controls are not available. Run the migration that creates the video_access table to enable this feature.'
        });
    }
    return ready;
};

const buildUsernameOnlyRestriction = ({ alias = 'v', userId, username, params, startIndex, includeManualAccess }) => {
    if (!userId || !username) {
        return {
            clause: ` AND ${alias}.access_mode != 'username_only'`,
            addedParams: 0
        };
    }

    let clause = `
            AND (
                ${alias}.access_mode != 'username_only'
                OR ${alias}.uploader_id = $${startIndex}
                OR LOWER(${alias}.single_username) = LOWER($${startIndex + 1})
    `;

    if (includeManualAccess) {
        clause += `
                OR EXISTS (
                    SELECT 1 FROM video_access va
                    WHERE va.video_id = ${alias}.id
                    AND LOWER(va.username) = LOWER($${startIndex + 1})
                )
        `;
    }

    clause += `
            )
    `;

    params.push(userId, username);
    return { clause, addedParams: 2 };
};

const hasUsernameGateAccess = async (videoId, username, singleUsername) => {
    if (!username) return false;
    if (singleUsername && singleUsername.toLowerCase() === username.toLowerCase()) {
        return true;
    }

    const hasManualAccess = await checkVideoAccessAvailability();
    if (!hasManualAccess) {
        return false;
    }

    const result = await pool.query(
        'SELECT 1 FROM video_access WHERE video_id = $1 AND LOWER(username) = LOWER($2) LIMIT 1',
        [videoId, username]
    );
    return result.rows.length > 0;
};

exports.listVideos = async (req, res, next) => {
    try {
        const { page = 1, limit = 20, category, tag, sort = 'newest' } = req.query;
        const offset = (page - 1) * limit;
        const userId = req.user ? req.user.id : null;
        const username = req.user ? req.user.username : '';
        const isStaff = req.user ? STAFF_ROLES.has(req.user.role) : false;
        const includeManualAccess = await checkVideoAccessAvailability();
        
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

        if (!isStaff) {
            const { clause, addedParams } = buildUsernameOnlyRestriction({
                alias: 'v',
                userId,
                username,
                params,
                startIndex: paramIndex,
                includeManualAccess
            });
            query += clause;
            paramIndex += addedParams;
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
    const userId = req.user ? req.user.id : null;
    const username = req.user ? req.user.username : null;
    const userRole = req.user ? req.user.role : null;
    const isStaff = userRole ? STAFF_ROLES.has(userRole) : false;

    try {
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name, u.role as uploader_role, c.name as category_name,
                   COALESCE(json_agg(json_build_object('id', t.id, 'name', t.name)) FILTER (WHERE t.id IS NOT NULL), '[]') as tags,
                   EXISTS(SELECT 1 FROM favorites WHERE video_id = v.id AND user_id = $2) as is_favorited,
                   (SELECT is_like FROM video_ratings WHERE video_id = v.id AND user_id = $2) as user_rating
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            LEFT JOIN categories c ON v.category_id = c.id
            LEFT JOIN video_tags vt ON v.id = vt.video_id
            LEFT JOIN tags t ON vt.tag_id = t.id
            WHERE v.id = $1
            GROUP BY v.id, u.username, u.role, c.name
        `, [id, userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const video = result.rows[0];
        const isUploader = userId && video.uploader_id === userId;

        // Check community/creator restriction
        if (video.uploader_role === 'creator' && !req.user) {
            return res.status(401).json({ message: 'Please sign up to view community content' });
        }

        if (video.access_mode === 'paidfans' && !isStaff && !isUploader) {
            const hasMembership = userId ? await membershipService.hasActiveMembership(userId) : false;
            if (!hasMembership) {
                return res.status(402).json({ message: 'Active membership required to view this video' });
            }
        }

        if (video.access_mode === 'username_only' && !isStaff && !isUploader) {
            const hasAccess = await hasUsernameGateAccess(video.id, username, video.single_username);
            if (!hasAccess) {
                return res.status(403).json({ message: 'This video is restricted to specific usernames. Contact the creator for access.' });
            }
        }

        // Check privacy
        if (video.is_private) {
            if (!userId) return res.status(403).json({ message: 'This video is private' });
            
            if (video.uploader_id !== userId) {
                const followCheck = await pool.query(
                    "SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2 AND status = 'approved'",
                    [userId, video.uploader_id]
                );
                if (followCheck.rows.length === 0 && !STAFF_ROLES.has(userRole)) {
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

const queueService = require('../services/queueService');
const storageService = require('../services/storageService');
const { validateVideoFile } = require('../utils/fileValidator');

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
            // Clean up file if validation fails
            await storageService.deleteFile(file.filename);
            return res.status(400).json({ message: 'Title is required' });
        }

        // Security: Validate File Magic Number
        const isValid = await validateVideoFile(file.path);
        if (!isValid) {
            await storageService.deleteFile(file.filename);
            return res.status(400).json({ message: 'Invalid video file format' });
        }

        // Insert into DB with status 'processing'
        // We store the URL immediately, but thumbnail and duration will be updated by the worker
        const videoUrl = storageService.getFileUrl(file.filename);
        
        const result = await pool.query(
            'INSERT INTO videos (uploader_id, title, description, video_url, status, category_id, is_private, is_community) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, title, status, created_at, video_url, is_private, is_community',
            [
                userId, 
                title, 
                description || '', 
                videoUrl,
                'processing',
                category_id || null,
                is_private === 'true' || is_private === true,
                is_community === 'true' || is_community === true
            ]
        );

        const video = result.rows[0];

        // Add to processing queue
        queueService.addJob({
            videoId: video.id,
            filename: file.filename,
            filePath: file.path
        });

        res.status(201).json({
            message: 'Video uploaded successfully. Processing started.',
            video: video
        });
    } catch (error) {
        console.error('Upload error:', error);
        // Try to clean up file
        if (req.file) await storageService.deleteFile(req.file.filename);
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
        const userId = req.user ? req.user.id : null;
        const username = req.user ? req.user.username : '';
        const isStaff = req.user ? STAFF_ROLES.has(req.user.role) : false;
        const includeManualAccess = await checkVideoAccessAvailability();
        let query = `
            SELECT v.*, u.username as uploader_name 
            FROM videos v 
            JOIN users u ON v.uploader_id = u.id 
            WHERE v.is_community = true AND v.status = 'approved' AND v.is_private = false
        `;
        const params = [];
        let paramIndex = 1;

        if (!isStaff) {
            const { clause, addedParams } = buildUsernameOnlyRestriction({
                alias: 'v',
                userId,
                username,
                params,
                startIndex: paramIndex,
                includeManualAccess
            });
            query += clause;
            paramIndex += addedParams;
        }

        query += ' ORDER BY v.created_at DESC LIMIT 50';

        const result = await pool.query(query, params);
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
    const username = req.user.username;
    const isStaff = STAFF_ROLES.has(req.user.role);
    const includeManualAccess = await checkVideoAccessAvailability();
    try {
        let query = `
            SELECT v.*, u.username as uploader_name 
            FROM favorites f
            JOIN videos v ON f.video_id = v.id
            JOIN users u ON v.uploader_id = u.id
            WHERE f.user_id = $1
        `;
        const params = [userId];

        if (!isStaff) {
            const { clause } = buildUsernameOnlyRestriction({
                alias: 'v',
                userId,
                username,
                params,
                startIndex: params.length + 1,
                includeManualAccess
            });
            query += clause;
        }

        query += ' ORDER BY f.created_at DESC';

        const result = await pool.query(query, params);
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
    const username = req.user.username;
    const isStaff = STAFF_ROLES.has(req.user.role);
    const includeManualAccess = await checkVideoAccessAvailability();
    try {
        let query = `
            SELECT v.*, u.username as uploader_name, wh.watched_at
            FROM watch_history wh
            JOIN videos v ON wh.video_id = v.id
            JOIN users u ON v.uploader_id = u.id
            WHERE wh.user_id = $1
        `;
        const params = [userId];

        if (!isStaff) {
            const { clause } = buildUsernameOnlyRestriction({
                alias: 'v',
                userId,
                username,
                params,
                startIndex: params.length + 1,
                includeManualAccess
            });
            query += clause;
        }

        query += ' ORDER BY wh.watched_at DESC LIMIT 25';

        const result = await pool.query(query, params);
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

exports.grantVideoAccess = async (req, res, next) => {
    const { id } = req.params;
    const { username } = req.body;
    const requestedUsername = username ? username.trim() : '';

    if (!(await ensureVideoAccessEnabled(res))) {
        return;
    }

    if (!requestedUsername) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const videoResult = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const isOwner = videoResult.rows[0].uploader_id === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update access for this video' });
        }

        const userLookup = await pool.query('SELECT id, username FROM users WHERE LOWER(username) = LOWER($1)', [requestedUsername]);
        if (userLookup.rows.length === 0) {
            return res.status(404).json({ message: 'Target user not found' });
        }

        const targetUsername = userLookup.rows[0].username;

        const accessResult = await pool.query(
            `INSERT INTO video_access (video_id, username, granted_by_creator_id)
             VALUES ($1, $2, $3)
             ON CONFLICT (video_id, username)
             DO UPDATE SET granted_by_creator_id = EXCLUDED.granted_by_creator_id, granted_at = NOW()
             RETURNING id, video_id, username, granted_at, granted_by_creator_id`,
            [id, targetUsername, req.user.id]
        );

        res.status(201).json({
            message: 'Access granted',
            access: accessResult.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

exports.revokeVideoAccess = async (req, res, next) => {
    const { id, username } = req.params;
    const requestedUsername = username ? username.trim() : '';

    if (!(await ensureVideoAccessEnabled(res))) {
        return;
    }

    if (!requestedUsername) {
        return res.status(400).json({ message: 'Username is required' });
    }

    try {
        const videoResult = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const isOwner = videoResult.rows[0].uploader_id === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update access for this video' });
        }

        const deleteResult = await pool.query(
            'DELETE FROM video_access WHERE video_id = $1 AND LOWER(username) = LOWER($2) RETURNING id',
            [id, requestedUsername]
        );

        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ message: 'Access record not found' });
        }

        res.json({ message: 'Access revoked' });
    } catch (error) {
        next(error);
    }
};

exports.updateVideoAccessMode = async (req, res, next) => {
    const { id } = req.params;
    const { access_mode: incomingMode, single_username } = req.body;
    const requestedMode = typeof incomingMode === 'string' ? incomingMode.trim().toLowerCase() : '';

    if (!requestedMode || !VALID_ACCESS_MODES.has(requestedMode)) {
        return res.status(400).json({ message: 'Invalid access mode' });
    }

    try {
        const videoResult = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const isOwner = videoResult.rows[0].uploader_id === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to update access for this video' });
        }

        let singleUsernameValue = null;
        const normalizedSingle = typeof single_username === 'string' ? single_username.trim() : '';
        if (requestedMode === 'username_only' && normalizedSingle) {
            const lookup = await pool.query('SELECT username FROM users WHERE LOWER(username) = LOWER($1)', [normalizedSingle]);
            if (lookup.rows.length === 0) {
                return res.status(404).json({ message: 'Specified username not found' });
            }
            singleUsernameValue = lookup.rows[0].username;
        }

        if (requestedMode !== 'username_only') {
            singleUsernameValue = null;
        }

        const updateResult = await pool.query(
            `UPDATE videos
             SET access_mode = $1,
                 single_username = $2,
                 updated_at = NOW()
             WHERE id = $3
             RETURNING id, access_mode, single_username`,
            [requestedMode, singleUsernameValue, id]
        );

        res.json({
            message: 'Access mode updated',
            video: updateResult.rows[0]
        });
    } catch (error) {
        next(error);
    }
};

exports.listVideoAccess = async (req, res, next) => {
    const { id } = req.params;

    if (!(await ensureVideoAccessEnabled(res))) {
        return;
    }

    try {
        const videoResult = await pool.query('SELECT uploader_id FROM videos WHERE id = $1', [id]);
        if (videoResult.rows.length === 0) {
            return res.status(404).json({ message: 'Video not found' });
        }

        const isOwner = videoResult.rows[0].uploader_id === req.user.id;
        const isAdmin = req.user.role === 'admin';
        if (!isOwner && !isAdmin) {
            return res.status(403).json({ message: 'Not authorized to view access for this video' });
        }

        const result = await pool.query(
            `SELECT id, username, granted_at, granted_by_creator_id
             FROM video_access
             WHERE video_id = $1
             ORDER BY granted_at DESC`,
            [id]
        );

        res.json(result.rows);
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
