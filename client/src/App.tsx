import { createContext, useContext, useEffect, useState } from 'react';
import { History } from './components/History';
import { WordInput } from './components/WordInput';

import './App.css';

import { socket } from './socket';

const PlayerPanel = ({ players, turnId }: { players: string[], turnId: string }) => { 
  return (
    <div className="playerPanel">
      <div style={{lineHeight: "2em", fontSize: ".8em"}}>
        PLAYERS ({players.length}):
      </div>
      {players.map(playerName => 
        <div 
          className={(turnId === playerName) ? "activePlayerName" : "playerName"}
          key={playerName}
        >
          {playerName}
        </div>
      )}
    </div>
  );
};

const GameSetup = ({ startFunc }: { startFunc: Function }) => { 
  return (
    <>
      <div className="title">NAME CHAIN</div>
      <div className="subtitle">ANIMALS EDITION</div>
      <button
        className="startButton"
        onClick={() => startFunc()}
      >
        START GAME
      </button>
    </>
  );
};

const GameInProgress = ({ 
    emitSubmit,
  }: { 
    emitSubmit: (newHistory: string[]) => void,
  }) => { 
  
  return (
    <div className="mainContent">
      <History history={history}/>
      <WordInput 
        history={history}
        emitFunc={emitSubmit}
        yourTurn={turn}
      />
    </div>
  );
};

const GameContext = createContext();

const App = () => {

  const [players, setPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [turnClientId, setTurnClientId] = useState<string>("");
  const [yourTurn, setYourTurn] = useState<boolean>(false);
  const [history, setHistory] = useState<Set<string>>(new Set()); 

  useEffect(() => {
    // if other client joins lobby
    socket.on("playersChange", newPlayers => {
      setPlayers(newPlayers);
    });

    // if game has already started when joining
    // socket.on("alreadyStarted", () => {
    //   setGameStarted(true);
    // });

    // if other client starts game
    socket.on("gameStarted", () => {
      setGameStarted(true);
    });

    // if game is ended
    socket.on("gameEnded", () => {
      setGameStarted(false);
    });

    socket.on("turnInfo", (bcHistory, turnId) => {
      setHistory(new Set(bcHistory));
      setTurnClientId(turnId);
      if (turnId === socket.id) {
        setYourTurn(true);
      };

      // console.log("turn", turnId)
    });
  }, []);

  // start game
  const startGame = () => { 
    socket.emit("start");
    setYourTurn(true);
  };

  const emitSubmit = (newHistory: string[]) => {
    socket.emit("submit", newHistory);
    setHistory(new Set(newHistory));
    setYourTurn(false);
  };

  return (
    <div className="app">
      <GameContext.Provider value={{players, turnClientId}}>
        <PlayerPanel players={players} turnId={turnClientId}/>
        {
          gameStarted 
          ? <GameInProgress emitSubmit={emitSubmit}/>
          : <GameSetup startFunc={startGame} />
        }
      </GameContext.Provider>
    </div>
  );
}

export default App;
