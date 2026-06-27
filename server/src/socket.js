import { Server } from 'socket.io';
import { eventBus } from './services/event-bus.js';
import { env } from './config/env.js';

export function attachSocket(server) {
  const io = new Server(server, {
    cors: {
      origin: env.clientOrigin,
      credentials: true,
    },
  });

  eventBus.on('agent_completed', (payload) => io.emit('agent_completed', payload));
  eventBus.on('workflow_executed', (payload) => io.emit('workflow_executed', payload));
  eventBus.on('new_email', (payload) => io.emit('new_email', payload));
  eventBus.on('new_ticket', (payload) => io.emit('new_ticket', payload));
  eventBus.on('new_invoice', (payload) => io.emit('new_invoice', payload));
  eventBus.on('new_meeting', (payload) => io.emit('new_meeting', payload));

  return io;
}
