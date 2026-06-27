import mongoose from 'mongoose';
import { env } from '../config/env.js';

function isConnected() {
  return mongoose.connection.readyState === 1 && Boolean(env.mongoUri);
}

export function createMongoAwareRepository({ storeName, model, idPrefix, toPublic = (item) => item }) {
  return {
    async list() {
      if (isConnected() && model) {
        return model.find().lean();
      }
      return (await import('../data/store.js')).store[storeName];
    },
    async findById(id) {
      if (isConnected() && model) {
        return model.findOne({ id }).lean();
      }
      const { store } = await import('../data/store.js');
      return store[storeName].find((item) => item.id === id) || null;
    },
    async findOne(predicate) {
      if (isConnected() && model) {
        return model.findOne(predicate).lean();
      }
      const { store } = await import('../data/store.js');
      return store[storeName].find(predicate) || null;
    },
    async create(doc) {
      if (isConnected() && model) {
        const count = await model.countDocuments();
        const payload = { id: doc.id || `${idPrefix}_${count + 1}`, ...doc };
        const record = await model.create(payload);
        return record.toObject();
      }
      const { store } = await import('../data/store.js');
      const record = { id: doc.id || `${idPrefix}_${store[storeName].length + 1}`, ...doc };
      store[storeName].push(record);
      return record;
    },
    async update(id, patch) {
      if (isConnected() && model) {
        const record = await model.findOneAndUpdate({ id }, patch, { new: true }).lean();
        return record;
      }
      const { store } = await import('../data/store.js');
      const record = store[storeName].find((item) => item.id === id);
      if (!record) return null;
      Object.assign(record, patch);
      return record;
    },
    async remove(id) {
      if (isConnected() && model) {
        const result = await model.deleteOne({ id });
        return result.deletedCount > 0;
      }
      const { store } = await import('../data/store.js');
      const index = store[storeName].findIndex((item) => item.id === id);
      if (index < 0) return false;
      store[storeName].splice(index, 1);
      return true;
    },
    publicItem(item) {
      return toPublic(item);
    },
  };
}
