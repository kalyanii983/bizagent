import { EventEmitter } from 'node:events';

export const eventBus = new EventEmitter();

export function emitSystemEvent(type, payload) {
  eventBus.emit(type, payload);
}
