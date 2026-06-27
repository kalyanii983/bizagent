import { Schema, model } from './base.js';

const meetingSchema = new Schema(
  {
    id: { type: String, required: true, index: true },
    title: { type: String, required: true },
    attendees: [{ type: String }],
    startTime: { type: String, default: '' },
    endTime: { type: String, default: '' },
    notes: { type: String, default: '' },
    status: { type: String, default: 'scheduled' },
    customerId: { type: String, default: null },
  },
  { timestamps: true }
);

export const MeetingModel = model('Meeting', meetingSchema);
