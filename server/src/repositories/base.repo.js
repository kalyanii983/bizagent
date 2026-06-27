import { store } from '../data/store.js';

function collection(name) {
  return store[name];
}

export function createRepository(name, { idPrefix, toPublic = (item) => item } = {}) {
  return {
    list() {
      return collection(name);
    },
    findById(id) {
      return collection(name).find((item) => item.id === id) || null;
    },
    findOne(predicate) {
      return collection(name).find(predicate) || null;
    },
    create(doc) {
      const record = {
        id: `${idPrefix}_${collection(name).length + 1}`,
        ...doc,
      };
      collection(name).push(record);
      return record;
    },
    update(id, patch) {
      const record = this.findById(id);
      if (!record) return null;
      Object.assign(record, patch);
      return record;
    },
    remove(id) {
      const items = collection(name);
      const index = items.findIndex((item) => item.id === id);
      if (index < 0) return false;
      items.splice(index, 1);
      return true;
    },
    publicItem(item) {
      return toPublic(item);
    },
  };
}
