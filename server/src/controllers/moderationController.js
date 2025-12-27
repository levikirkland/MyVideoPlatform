const { pool } = require('../config/db');

exports.getQueue = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT v.*, u.username as uploader_name 
            FROM videos v 
            LEFT JOIN users u ON v.uploader_id = u.id 
            WHERE v.status = 'pending_approval' 
            ORDER BY v.created_at ASC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.approveVideo = async (req, res, next) => {
    const { id } = req.params;
    const { tags } = req.body; // Array of tag names or IDs
    const adminId = req.user.id;
    
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        await client.query("UPDATE videos SET status = 'approved', published_at = NOW() WHERE id = $1", [id]);
        
        // Handle Tags
        if (tags && Array.isArray(tags) && tags.length > 0) {
            for (const tag of tags) {
                let tagId;
                // Check if tag is a UUID (existing tag ID)
                const isUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(tag);
                
                if (isUuid) {
                    tagId = tag;
                } else {
                    // It's a name, check if exists or create
                    const existing = await client.query('SELECT id FROM tags WHERE name = $1', [tag]);
                    if (existing.rows.length > 0) {
                        tagId = existing.rows[0].id;
                    } else {
                        const newTag = await client.query(
                            'INSERT INTO tags (name, created_by, is_approved) VALUES ($1, $2, true) RETURNING id',
                            [tag, adminId]
                        );
                        tagId = newTag.rows[0].id;
                    }
                }

                // Link tag to video
                await client.query(
                    'INSERT INTO video_tags (video_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                    [id, tagId]
                );
            }
        }

        // Audit Log
        await client.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id) VALUES ($1, 'approve', 'video', $2)",
            [adminId, id]
        );

        await client.query('COMMIT');
        res.json({ message: 'Video approved' });
    } catch (error) {
        await client.query('ROLLBACK');
        next(error);
    } finally {
        client.release();
    }
};

exports.rejectVideo = async (req, res, next) => {
    const { id } = req.params;
    const { reason } = req.body;
    const adminId = req.user.id;
    try {
        await pool.query("UPDATE videos SET status = 'rejected', rejection_reason = $1 WHERE id = $2", [reason, id]);
        
        // Audit Log
        await pool.query(
            "INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details) VALUES ($1, 'reject', 'video', $2, $3)",
            [adminId, id, JSON.stringify({ reason })]
        );

        res.json({ message: 'Video rejected' });
    } catch (error) {
        next(error);
    }
};

exports.getFlags = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT f.*, u.username as reporter_name,
            (SELECT COUNT(*) FROM flags WHERE target_id = f.target_id AND target_type = f.target_type AND status = 'pending') as flag_count
            FROM flags f 
            LEFT JOIN users u ON f.reporter_id = u.id
            WHERE f.status = 'pending'
            GROUP BY f.id, u.username
            ORDER BY flag_count DESC
        `);
        res.json(result.rows);
    } catch (error) {
        next(error);
    }
};

exports.resolveFlag = async (req, res, next) => {
    const { flagId } = req.params;
    const adminId = req.user.id;
    try {
        await pool.query("UPDATE flags SET status = 'resolved', reviewed_by = $1, reviewed_at = NOW() WHERE id = $2", [adminId, flagId]);
        res.json({ message: 'Flag resolved' });
    } catch (error) {
        next(error);
    }
};
