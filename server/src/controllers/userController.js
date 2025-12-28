const { pool } = require('../config/db');

exports.getProfile = async (req, res, next) => {
    try {
        const result = await pool.query(
            'SELECT id, email, username, role, avatar_url, bio, creator_status, created_at FROM users WHERE id = $1', 
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.updateProfile = async (req, res, next) => {
    const { username, avatar_url, bio } = req.body;
    try {
        const result = await pool.query(
            'UPDATE users SET username = COALESCE($1, username), avatar_url = COALESCE($2, avatar_url), bio = COALESCE($3, bio) WHERE id = $4 RETURNING id, username, avatar_url, bio',
            [username, avatar_url, bio, req.user.id]
        );
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.getUserPublicProfile = async (req, res, next) => {
    const { id } = req.params;
    const viewerId = req.user?.id;

    try {
        const userResult = await pool.query('SELECT id, username, avatar_url, bio, role, created_at FROM users WHERE id = $1', [id]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = userResult.rows[0];

        // Check if viewer is following
        let isFollowing = false;
        let followStatus = null;
        if (viewerId) {
            const followResult = await pool.query('SELECT status FROM follows WHERE follower_id = $1 AND following_id = $2', [viewerId, id]);
            if (followResult.rows.length > 0) {
                isFollowing = true;
                followStatus = followResult.rows[0].status;
            }
        }

        // Get videos - respect privacy
        let videoQuery = `
            SELECT v.id, v.title, v.thumbnail_url, v.views_count, v.created_at, v.is_private, u.username as uploader_name
            FROM videos v
            JOIN users u ON v.uploader_id = u.id
            WHERE v.uploader_id = $1 AND v.status = 'approved'
        `;
        
        const params = [id];

        if (viewerId !== id) {
            if (followStatus === 'approved') {
                // Can see public and private
                videoQuery += " AND (is_private = false OR is_private = true)";
            } else {
                // Can only see public
                videoQuery += " AND is_private = false";
            }
        }

        videoQuery += " ORDER BY created_at DESC LIMIT 20";

        const videosResult = await pool.query(videoQuery, params);

        // Get follower count
        const followerCountResult = await pool.query(
            "SELECT COUNT(*) FROM follows WHERE following_id = $1 AND status = 'approved'",
            [id]
        );
        const followerCount = parseInt(followerCountResult.rows[0].count, 10);

        res.json({
            user,
            videos: videosResult.rows,
            isFollowing,
            followStatus,
            followerCount
        });
    } catch (error) {
        next(error);
    }
};

exports.followUser = async (req, res, next) => {
    const { id } = req.params; // User to follow
    const followerId = req.user.id;

    if (id === followerId) return res.status(400).json({ message: 'Cannot follow yourself' });

    try {
        const targetUser = await pool.query('SELECT role FROM users WHERE id = $1', [id]);
        if (targetUser.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        // If target is a creator, follow might need approval for private content, 
        // but for now let's just make it 'approved' by default unless we want a request system.
        // The prompt says "Private vids should only be seen by those who the Creator approves. from a Follow Request."
        // So if target is creator, status = 'pending'.
        const status = targetUser.rows[0].role === 'creator' ? 'pending' : 'approved';

        await pool.query(
            'INSERT INTO follows (follower_id, following_id, status) VALUES ($1, $2, $3) ON CONFLICT (follower_id, following_id) DO NOTHING',
            [followerId, id, status]
        );

        res.json({ message: status === 'pending' ? 'Follow request sent' : 'Following user', status });
    } catch (error) {
        next(error);
    }
};

exports.unfollowUser = async (req, res, next) => {
    const { id } = req.params;
    const followerId = req.user.id;

    try {
        await pool.query('DELETE FROM follows WHERE follower_id = $1 AND following_id = $2', [followerId, id]);
        res.json({ message: 'Unfollowed user' });
    } catch (error) {
        next(error);
    }
};

exports.requestCreatorStatus = async (req, res, next) => {
    const { id_photo_url } = req.body;
    if (!id_photo_url) return res.status(400).json({ message: 'ID photo is required' });

    try {
        await pool.query(
            "UPDATE users SET creator_status = 'pending', creator_id_url = $1 WHERE id = $2",
            [id_photo_url, req.user.id]
        );
        res.json({ message: 'Creator request submitted' });
    } catch (error) {
        next(error);
    }
};

exports.sendMessage = async (req, res, next) => {
    const { id } = req.params; // Recipient user ID
    const senderId = req.user.id;
    const { content } = req.body;

    if (id === senderId) {
        return res.status(400).json({ message: 'Cannot message yourself' });
    }

    if (!content || content.trim().length === 0) {
        return res.status(400).json({ message: 'Message content is required' });
    }

    if (content.length > 500) {
        return res.status(400).json({ message: 'Message too long (max 500 characters)' });
    }

    try {
        // Check if recipient exists and is a creator
        const recipientResult = await pool.query(
            'SELECT id, username, role FROM users WHERE id = $1',
            [id]
        );

        if (recipientResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const recipient = recipientResult.rows[0];

        // Only allow messaging creators
        if (recipient.role !== 'creator') {
            return res.status(403).json({ message: 'Can only message creators' });
        }

        // Insert message into messages table
        const result = await pool.query(
            `INSERT INTO messages (sender_id, recipient_id, content, created_at)
             VALUES ($1, $2, $3, NOW())
             RETURNING id, sender_id, recipient_id, content, created_at, is_read`,
            [senderId, id, content.trim()]
        );

        res.status(201).json({
            message: 'Message sent successfully',
            data: result.rows[0]
        });
    } catch (error) {
        next(error);
    }
};
