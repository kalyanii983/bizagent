import React from 'react';
import { AppRoutes } from './routes.jsx';
import { createSocketClient } from './socket.js';
import { Toaster } from 'react-hot-toast';

export default function App() {
  React.useEffect(() => {
    const socket = createSocketClient();
    socket.on('agent_completed', () => {});
    socket.on('workflow_executed', () => {});
    return () => socket.disconnect();
  }, []);

  return (
    <>
      <AppRoutes />
      <Toaster position="top-right" />
    </>
  );
}
