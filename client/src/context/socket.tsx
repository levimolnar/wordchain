import { createContext } from 'react';
import { io, Socket } from 'socket.io-client';

const socket = io('http://localhost:3001'); // , { reconnection: true }
export const SocketContext = createContext<Socket>(socket);

export const SocketProvider = ({ children }: any) => (
  <SocketContext.Provider value={socket}>
    {children}
  </SocketContext.Provider>
);