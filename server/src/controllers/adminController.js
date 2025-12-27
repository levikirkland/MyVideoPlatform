const { pool } = require('../config/db');

exports.getStats = async (req, res, next) => {
    try {
        const userCount = await pool.query('SELECT COUNT(*) FROM users');
        const videoCount = await pool.query('SELECT COUNT(*) FROM videos');
        const pendingVideoCount = await pool.query("SELECT COUNT(*) FROM videos WHERE status = 'pending_approval'");
        const flagCount = await pool.query("SELECT COUNT(*) FROM flags WHERE status = 'pending'");

        res.json({
            users: parseInt(userCount.rows[0].count),
            videos: parseInt(videoCount.rows[0].count),
            pendingVideos: parseInt(pendingVideoCount.rows[0].count),
            pendingFlags: parseInt(flagCount.rows[0].count)
        });
    } catch (error) {
        next(error);
    }
};

exports.listUsers = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT id, email, username, role, is_verified as email_verified, created_at FROM users ORDER BY created_at DESC LIMIT 50');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.updateUserRole = async (req, res, next) => {
    const { id } = req.params;
    const { role } = req.body;
    const adminId = req.user.id;

    try {
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        
        // Audit Log
        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'update_role', 'user', $2, $3)",
            [adminId, id, JSON.stringify({ new_role: role })]
        );

        res.json({ message: 'User role updated' });
    } catch (error) {
        next(error);
    }
};

exports.getAuditLogs = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT a.*, u.username as actor_name 
            FROM audit_logs a 
            LEFT JOIN users u ON a.actor_id = u.id 
            ORDER BY a.created_at DESC LIMIT 100
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Categories
exports.listCategories = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM categories ORDER BY name ASC');
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

// Tags
exports.listTags = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT t.*, u.username as creator_name 
            FROM tags t 
            LEFT JOIN users u ON t.created_by = u.id 
            ORDER BY t.name ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.createTag = async (req, res, next) => {
    const { name } = req.body;
    const adminId = req.user.id;
    try {
        const result = await pool.query(
            'INSERT INTO tags (name, created_by, is_approved) VALUES ($1, $2, true) RETURNING *',
            [name, adminId]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.approveTag = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE tags SET is_approved = true WHERE id = $1 RETURNING *',
            [id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Tag not found' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.deleteTag = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM tags WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Tag not found' });
        res.json({ message: 'Tag deleted' });
    } catch (error) {
        next(error);
    }
};

exports.createCategory = async (req, res, next) => {
    const { name, description, slug } = req.body;
    const finalSlug = slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    try {
        const result = await pool.query(
            'INSERT INTO categories (name, description, slug) VALUES ($1, $2, $3) RETURNING *',
            [name, description, finalSlug]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.updateCategory = async (req, res, next) => {
    const { id } = req.params;
    const { name, description, slug } = req.body;
    const finalSlug = slug || name.toLowerCase().replace(/ /g, '-').replace(/[^\w-]+/g, '');
    try {
        const result = await pool.query(
            'UPDATE categories SET name = $1, description = $2, slug = $3 WHERE id = $4 RETURNING *',
            [name, description, finalSlug, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found' });
        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.deleteCategory = async (req, res, next) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM categories WHERE id = $1 RETURNING *', [id]);
        if (result.rows.length === 0) return res.status(404).json({ message: 'Category not found' });
        res.json({ message: 'Category deleted' });
    } catch (error) {
        next(error);
    }
};

// User Management (Ban/Timeout)
exports.banUser = async (req, res, next) => {
    const { id } = req.params;
    const { reason, duration_hours } = req.body; 
    const adminId = req.user.id;

    try {
        let bannedUntil = null;
        if (duration_hours) {
            bannedUntil = new Date(Date.now() + duration_hours * 60 * 60 * 1000);
        } else {
            bannedUntil = new Date('9999-12-31');
        }

        await pool.query(
            'UPDATE users SET banned_until = $1, ban_reason = $2 WHERE id = $3',
            [bannedUntil, reason, id]
        );

        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'ban_user', 'user', $2, $3)",
            [adminId, id, JSON.stringify({ reason, banned_until: bannedUntil })]
        );

        res.json({ message: 'User banned/timed out', bannedUntil });
    } catch (error) {
        next(error);
    }
};

exports.unbanUser = async (req, res, next) => {
    const { id } = req.params;
    const adminId = req.user.id;
    try {
        await pool.query('UPDATE users SET banned_until = NULL, ban_reason = NULL WHERE id = $1', [id]);
        
        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'unban_user', 'user', $2, $3)",
            [adminId, id, JSON.stringify({})]
        );

        res.json({ message: 'User unbanned' });
    } catch (error) {
        next(error);
    }
};

// Removal Requests
exports.listRemovalRequests = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT rr.*, v.title as video_title 
            FROM removal_requests rr
            LEFT JOIN videos v ON rr.video_id = v.id
            WHERE rr.status = 'pending'
            ORDER BY rr.created_at DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.processRemovalRequest = async (req, res, next) => {
    const { id } = req.params;
    const { status, admin_notes } = req.body; 
    const adminId = req.user.id;

    try {
        const result = await pool.query(
            'UPDATE removal_requests SET status = $1, admin_notes = $2, processed_at = NOW(), processed_by = $3 WHERE id = $4 RETURNING *',
            [status, admin_notes, adminId, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'Request not found' });

        const request = result.rows[0];

        if (status === 'approved') {
            await pool.query("UPDATE videos SET status = 'removed' WHERE id = $1", [request.video_id]);
        }

        res.json(request);
    } catch (error) {
        next(error);
    }
};

exports.listCreatorRequests = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, username, email, creator_status, creator_id_url, created_at 
            FROM users 
            WHERE creator_status = 'pending'
            ORDER BY created_at ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.processCreatorRequest = async (req, res, next) => {
    const { id } = req.params;
    const { status } = req.body; // 'approved' or 'rejected'
    const adminId = req.user.id;

    try {
        const role = status === 'approved' ? 'creator' : 'user';
        const result = await pool.query(
            "UPDATE users SET creator_status = $1, role = $2 WHERE id = $3 RETURNING id, username, role, creator_status",
            [status, role, id]
        );

        if (result.rows.length === 0) return res.status(404).json({ message: 'User not found' });

        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'process_creator_request', 'user', $2, $3)",
            [adminId, id, JSON.stringify({ status, role })]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.getSettings = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM system_settings');
        const settings = {};
        result.rows.forEach(row => {
            settings[row.key] = row.value;
        });
        res.json(settings);
    } catch (error) {
        next(error);
    }
};

exports.updateSettings = async (req, res, next) => {
    const { settings } = req.body; // Object with key-value pairs
    const adminId = req.user.id;

    try {
        for (const [key, value] of Object.entries(settings)) {
            await pool.query(
                'INSERT INTO system_settings (key, value, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()',
                [key, JSON.stringify(value)]
            );
        }

        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'update_settings', 'system', $1, $2)",
            [adminId, JSON.stringify(settings)]
        );

        res.json({ message: 'Settings updated' });
    } catch (error) {
        next(error);
    }
};

exports.updateVideo = async (req, res, next) => {
    const { id } = req.params;
    const { title, description, category_id, is_private, is_community } = req.body;
    const adminId = req.user.id;

    try {
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

        if (result.rows.length === 0) return res.status(404).json({ message: 'Video not found' });

        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'update_video', 'video', $2, $3)",
            [adminId, id, JSON.stringify({ title, description, category_id, is_private, is_community })]
        );

        res.json(result.rows[0]);
    } catch (error) {
        next(error);
    }
};

exports.addTagToVideo = async (req, res, next) => {
    const { id } = req.params; // video_id
    const { tagName } = req.body;
    const adminId = req.user.id;

    try {
        // 1. Find or create the tag
        let tagResult = await pool.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        let tagId;

        if (tagResult.rows.length === 0) {
            const newTag = await pool.query(
                'INSERT INTO tags (name, created_by, is_approved) VALUES ($1, $2, true) RETURNING id',
                [tagName, adminId]
            );
            tagId = newTag.rows[0].id;
        } else {
            tagId = tagResult.rows[0].id;
        }

        // 2. Link tag to video
        await pool.query(
            'INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
            [id, tagId]
        );

        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'add_tag_to_video', 'video', $2, $3)",
            [adminId, id, JSON.stringify({ tagName, tagId })]
        );

        res.json({ message: 'Tag added to video' });
    } catch (error) {
        next(error);
    }
};
