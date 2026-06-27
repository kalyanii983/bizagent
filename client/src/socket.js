import { io } from 'socket.io-client';

export function createSocketClient() {
  const url = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:4000';
  return io(url, { withCredentials: true });
}
