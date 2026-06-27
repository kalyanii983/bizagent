import { Schema, model } from './base.js';

const notificationSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    userId: { type: String, default: null },
    type: { type: String, required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export const NotificationModel = model('Notification', notificationSchema);
