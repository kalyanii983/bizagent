import { Schema, model } from './base.js';
import { ROLES } from '../config/constants.js';

const userSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.VIEWER },
    refreshTokenHash: { type: String, default: null },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const UserModel = model('User', userSchema);
