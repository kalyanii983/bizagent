import mongoose from 'mongoose';

const { Schema, model } = mongoose;

export const timestamped = {
  timestamps: true,
};

export { Schema, model };
