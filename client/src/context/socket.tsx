import { createContext } from 'react';
import { io, Socket } from 'socket.io-client';


// const address = process.env['REACT_APP_SERVER_ADDRESS'] ?? "localhost:3001";
// const port = process.env['REACT_APP_SERVER_PORT'] ?? "3001";

const address = process.env['REACT_APP_SERVER_ADDRESS'];
const socket: Socket = (address) ? io(`https://${address}`) : io(`http://localhost:3001`);
// socket.on("connect", () => { console.log("connected!") });

console.log("address: ", address);

export const SocketContext = createContext<Socket>(socket);

export const SocketProvider = ({ children }: any) => (
  <SocketContext.Provider value={socket}>
    {children}
  </SocketContext.Provider>
);