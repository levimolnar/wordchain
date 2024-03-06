// import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

import { SocketProvider } from './context/socket';
import { GameProvider } from './context/game';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  // <React.StrictMode>
    <SocketProvider>
      <GameProvider>
        <App />
      </GameProvider>
    </SocketProvider>
  // </React.StrictMode>
);
