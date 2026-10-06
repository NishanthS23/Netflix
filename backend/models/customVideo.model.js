import crypto from 'crypto';
import { pool } from '../config/db.config.js';

function mapRowToCustomVideo(row) {
  if (!row) return null;
  return new CustomVideo({
    id: row.id,
    _id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    videoPath: row.video_path,
    videoFileId: row.video_file_id,
    videoFilename: row.video_filename,
    videoContentType: row.video_content_type,
    videoSize: Number(row.video_size),
    thumbnailPath: row.thumbnail_path,
    thumbnailFileId: row.thumbnail_file_id,
    userId: row.user_id,
    username: row.username,
    views: Number(row.views || 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _isExisting: true,
  });
}

export class CustomVideo {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomBytes(12).toString('hex');
    this._id = this.id;
    this.title = data.title;
    this.description = data.description || '';
    this.category = data.category || 'General';
    this.videoPath = data.videoPath || null;
    this.videoFileId = data.videoFileId ? String(data.videoFileId) : null;
    this.videoFilename = data.videoFilename;
    this.videoContentType = data.videoContentType || 'video/mp4';
    this.videoSize = data.videoSize ? Number(data.videoSize) : 0;
    this.thumbnailPath = data.thumbnailPath || null;
    this.thumbnailFileId = data.thumbnailFileId ? String(data.thumbnailFileId) : null;
    this.userId = data.userId ? String(data.userId) : null;
    this.username = data.username;
    this.views = Number(data.views || 0);
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this._isExisting = Boolean(data._isExisting);
  }

  get _doc() {
    return this.toObject();
  }

  toObject() {
    return {
      _id: this.id,
      id: this.id,
      title: this.title,
      description: this.description,
      category: this.category,
      videoPath: this.videoPath,
      videoFileId: this.videoFileId,
      videoFilename: this.videoFilename,
      videoContentType: this.videoContentType,
      videoSize: this.videoSize,
      thumbnailPath: this.thumbnailPath,
      thumbnailFileId: this.thumbnailFileId,
      userId: this.userId,
      username: this.username,
      views: this.views,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    return this.toObject();
  }

  async save() {
    this.updatedAt = new Date();

    if (this._isExisting) {
      const query = `
        UPDATE custom_videos
        SET title = $2,
            description = $3,
            category = $4,
            video_path = $5,
            video_file_id = $6,
            video_filename = $7,
            video_content_type = $8,
            video_size = $9,
            thumbnail_path = $10,
            thumbnail_file_id = $11,
            user_id = $12,
            username = $13,
            views = $14,
            updated_at = $15
        WHERE id = $1
        RETURNING *;
      `;
      const values = [
        this.id,
        this.title,
        this.description,
        this.category,
        this.videoPath,
        this.videoFileId,
        this.videoFilename,
        this.videoContentType,
        this.videoSize,
        this.thumbnailPath,
        this.thumbnailFileId,
        this.userId,
        this.username,
        this.views,
        this.updatedAt,
      ];
      const res = await pool.query(query, values);
      const updated = mapRowToCustomVideo(res.rows[0]);
      Object.assign(this, updated);
      return this;
    } else {
      const query = `
        INSERT INTO custom_videos (
          id, title, description, category, video_path, video_file_id,
          video_filename, video_content_type, video_size, thumbnail_path,
          thumbnail_file_id, user_id, username, views, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *;
      `;
      const values = [
        this.id,
        this.title,
        this.description,
        this.category,
        this.videoPath,
        this.videoFileId,
        this.videoFilename,
        this.videoContentType,
        this.videoSize,
        this.thumbnailPath,
        this.thumbnailFileId,
        this.userId,
        this.username,
        this.views,
        this.createdAt,
        this.updatedAt,
      ];
      const res = await pool.query(query, values);
      const created = mapRowToCustomVideo(res.rows[0]);
      Object.assign(this, created);
      return this;
    }
  }

  static find(criteria = {}) {
    const executeQuery = async (sortOrder = 'DESC') => {
      const res = await pool.query(`SELECT * FROM custom_videos ORDER BY created_at ${sortOrder};`);
      return res.rows.map(mapRowToCustomVideo);
    };

    return {
      then: (resolve, reject) => executeQuery().then(resolve, reject),
      catch: (reject) => executeQuery().catch(reject),
      sort: function (sortObj = {}) {
        const order = sortObj.createdAt === 1 ? 'ASC' : 'DESC';
        return executeQuery(order);
      },
    };
  }

  static async findById(id) {
    if (!id) return null;
    const res = await pool.query('SELECT * FROM custom_videos WHERE id = $1 LIMIT 1;', [String(id)]);
    return mapRowToCustomVideo(res.rows[0]);
  }

  static async findByIdAndDelete(id) {
    if (!id) return null;
    const res = await pool.query('DELETE FROM custom_videos WHERE id = $1 RETURNING *;', [String(id)]);
    return mapRowToCustomVideo(res.rows[0]);
  }
}

export default CustomVideo;
