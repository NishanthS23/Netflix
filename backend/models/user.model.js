import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db.config.js';
import { generateProfilePicture, hashPassword } from '../helpers/helper.js';

/**
 * Maps a PostgreSQL user row to a User model instance.
 */
function mapRowToUser(row) {
  if (!row) return null;
  return new User({
    id: row.id,
    _id: row.id,
    username: row.username,
    email: row.email,
    password: row.password,
    isVerified: row.is_verified,
    lastLogin: row.last_login,
    profilePic: row.profile_pic,
    searchHistory: Array.isArray(row.search_history) ? row.search_history : (typeof row.search_history === 'string' ? JSON.parse(row.search_history) : []),
    resetPasswordToken: row.reset_password_token,
    resetPasswordExpiresAt: row.reset_password_expires_at,
    verificationToken: row.verification_token,
    verificationExpiresAt: row.verification_expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    _isExisting: true,
  });
}

export class User {
  constructor(data = {}) {
    this.id = data.id || data._id || crypto.randomBytes(12).toString('hex');
    this._id = this.id;
    this.username = data.username;
    this.email = data.email;
    this.password = data.password;
    this.isVerified = data.isVerified !== undefined ? data.isVerified : false;
    this.lastLogin = data.lastLogin || new Date();
    this.profilePic = data.profilePic || generateProfilePicture();
    this.searchHistory = data.searchHistory || [];
    this.resetPasswordToken = data.resetPasswordToken || null;
    this.resetPasswordExpiresAt = data.resetPasswordExpiresAt || null;
    this.verificationToken = data.verificationToken || null;
    this.verificationExpiresAt = data.verificationExpiresAt || null;
    this.createdAt = data.createdAt || new Date();
    this.updatedAt = data.updatedAt || new Date();
    this._isExisting = Boolean(data._isExisting);
    this._originalPassword = data._isExisting ? data.password : null;
  }

  get _doc() {
    return this.toObject();
  }

  toObject() {
    return {
      _id: this.id,
      id: this.id,
      username: this.username,
      email: this.email,
      password: this.password,
      isVerified: this.isVerified,
      lastLogin: this.lastLogin,
      profilePic: this.profilePic,
      searchHistory: this.searchHistory,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toJSON() {
    const obj = this.toObject();
    delete obj.password;
    return obj;
  }

  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }

  async save() {
    // Hash password if modified or newly created
    if (this.password && this.password !== this._originalPassword && !this.password.startsWith('$2a$') && !this.password.startsWith('$2b$')) {
      this.password = await hashPassword(this.password);
    }

    this.updatedAt = new Date();

    if (this._isExisting) {
      const query = `
        UPDATE users
        SET username = $2,
            email = $3,
            password = $4,
            is_verified = $5,
            last_login = $6,
            profile_pic = $7,
            search_history = $8,
            reset_password_token = $9,
            reset_password_expires_at = $10,
            verification_token = $11,
            verification_expires_at = $12,
            updated_at = $13
        WHERE id = $1
        RETURNING *;
      `;
      const values = [
        this.id,
        this.username,
        this.email,
        this.password,
        this.isVerified,
        this.lastLogin,
        this.profilePic,
        JSON.stringify(this.searchHistory || []),
        this.resetPasswordToken,
        this.resetPasswordExpiresAt,
        this.verificationToken,
        this.verificationExpiresAt,
        this.updatedAt,
      ];
      const res = await pool.query(query, values);
      const updated = mapRowToUser(res.rows[0]);
      Object.assign(this, updated);
      return this;
    } else {
      const query = `
        INSERT INTO users (
          id, username, email, password, is_verified, last_login, profile_pic,
          search_history, reset_password_token, reset_password_expires_at,
          verification_token, verification_expires_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *;
      `;
      const values = [
        this.id,
        this.username,
        this.email,
        this.password,
        this.isVerified,
        this.lastLogin,
        this.profilePic,
        JSON.stringify(this.searchHistory || []),
        this.resetPasswordToken,
        this.resetPasswordExpiresAt,
        this.verificationToken,
        this.verificationExpiresAt,
        this.createdAt,
        this.updatedAt,
      ];
      const res = await pool.query(query, values);
      const created = mapRowToUser(res.rows[0]);
      Object.assign(this, created);
      return this;
    }
  }

  static async findOne(criteria = {}) {
    let whereClauses = [];
    let values = [];
    let idx = 1;

    if (criteria.email) {
      whereClauses.push(`LOWER(email) = LOWER($${idx++})`);
      values.push(criteria.email);
    }
    if (criteria.username) {
      whereClauses.push(`username = $${idx++}`);
      values.push(criteria.username);
    }
    if (criteria.verificationToken) {
      whereClauses.push(`verification_token = $${idx++}`);
      values.push(criteria.verificationToken);
    }
    if (criteria.resetPasswordToken) {
      whereClauses.push(`reset_password_token = $${idx++}`);
      values.push(criteria.resetPasswordToken);
    }
    if (criteria.verificationExpiresAt && criteria.verificationExpiresAt.$gt) {
      whereClauses.push(`verification_expires_at > $${idx++}`);
      values.push(new Date(criteria.verificationExpiresAt.$gt));
    }
    if (criteria.resetPasswordExpiresAt && criteria.resetPasswordExpiresAt.$gt) {
      whereClauses.push(`reset_password_expires_at > $${idx++}`);
      values.push(new Date(criteria.resetPasswordExpiresAt.$gt));
    }

    const where = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const res = await pool.query(`SELECT * FROM users ${where} LIMIT 1;`, values);
    return mapRowToUser(res.rows[0]);
  }

  static findById(id) {
    const queryPromise = (async () => {
      const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1;', [String(id)]);
      return mapRowToUser(res.rows[0]);
    })();

    // Provide chainable .select() support for Mongoose compatibility
    return {
      then: (resolve, reject) => queryPromise.then(resolve, reject),
      catch: (reject) => queryPromise.catch(reject),
      select: function (fields) {
        return (async () => {
          const user = await queryPromise;
          if (!user) return null;
          if (typeof fields === 'string' && fields.includes('-password')) {
            user.password = undefined;
          }
          return user;
        })();
      },
    };
  }

  static async findByIdAndUpdate(id, update = {}, options = {}) {
    const user = await User.findById(id);
    if (!user) return null;

    if (update.$push && update.$push.searchHistory) {
      const history = user.searchHistory || [];
      history.push(update.$push.searchHistory);
      user.searchHistory = history;
    }

    if (update.$pull && update.$pull.searchHistory) {
      const pullItem = update.$pull.searchHistory;
      if (pullItem.id) {
        user.searchHistory = (user.searchHistory || []).filter(
          (item) => item.id !== pullItem.id && item.id !== Number(pullItem.id)
        );
      }
    }

    await user.save();
    return user;
  }
}

export default User;
