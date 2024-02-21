import React, { useEffect, useState } from 'react';
import { History } from './components/History';
import { WordInput } from './components/WordInput';

import './App.css';

import { socket } from './socket';

const PlayerPanel = ({ players }: { players: string[] }) => { 
  return (
    <div className="playerPanel">
      <div style={{lineHeight: "2em", fontSize: ".8em"}}>
        PLAYERS ({players.length}):
      </div>
      {players.map(playerName => 
        <div style={{fontStyle: "italic", fontSize: ".8em"}}>{playerName}</div>
      )}
    </div>
  );
};


const GameSetup = ({ startFunc }: { startFunc: Function }) => { 
  return (
    <button
      className="startButton"
      onClick={() => startFunc()}
    >
      START GAME
    </button>
  );
};

const GameInProgress = ({ turnState: [turn, setTurn] }: { turnState: [boolean, any] }) => { 

  const [history, setHistory] = useState<Set<string>>(new Set()); 

  useEffect(()=>{

    // console.log(socket.id);

    socket.on("turnInfo", (bcHistory, playerWithTurn) => {
      setHistory(new Set(bcHistory));
      console.log(socket.id, playerWithTurn);
    });

    // return () => {
    //   socket.off("historyBroadcast", (bcHistory) => {
    //     setHistory(new Set(bcHistory));           
    //   });
    // };
  }, []);

  const emitSubmit = (newHistory: string[]) => {
    socket.emit("submit", newHistory);
    setHistory(new Set(newHistory));
  };
  
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


const App = () => {

  const [players, setPlayers] = useState<string[]>([]);
  const [gameStarted, setGameStarted] = useState<boolean>(false);
  const [yourTurn, setYourTurn] = useState<boolean>(false);

  useEffect(() => {
    // if other client joins lobby
    socket.on("playersChange", newPlayers => {
      setPlayers(newPlayers);
    });

    // if other client starts game
    socket.on("gameStarted", () => {
      setGameStarted(true);
    });
  }, []);

  // start game
  const startGame = () => { 
    socket.emit("start");
    setGameStarted(true);
    setYourTurn(true);
  };

  return (
    <div className="app">
      <PlayerPanel players={players}/>
      {
        gameStarted
        ? <GameInProgress turnState={[yourTurn, setYourTurn]} />
        : <GameSetup startFunc={startGame} />
      }
    </div>
  );
}

export default App;
