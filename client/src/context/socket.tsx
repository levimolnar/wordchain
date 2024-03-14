import { createContext } from 'react';
import { io, Socket } from 'socket.io-client';

const address = process.env.REACT_APP_SERVER_ADDRESS ?? "localhost";
const socket = io(`http://${address}:${process.env.REACT_APP_SERVER_PORT}`);

console.log(`http://${address}:${process.env.REACT_APP_SERVER_PORT}`);

export const SocketContext = createContext<Socket>(socket);

export const SocketProvider = ({ children }: any) => (
  <SocketContext.Provider value={socket}>
    {children}
  </SocketContext.Provider>
);