import { createContext } from 'react';
import { io, Socket } from 'socket.io-client';


const address = process.env['REACT_APP_SERVER_ADDRESS'] ?? "localhost";
// const port = process.env['REACT_APP_SERVER_PORT'] ?? "3001";

// const socket = io(`http://${address}:${port}`);
// console.log(`http://${address}:${port}`);

const socket = io(`http://${address}`);
console.log(`http://${address}`);

export const SocketContext = createContext<Socket>(socket);

export const SocketProvider = ({ children }: any) => (
  <SocketContext.Provider value={socket}>
    {children}
  </SocketContext.Provider>
);