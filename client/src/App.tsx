import { createContext, useContext, useEffect, useState } from 'react';
import { History } from './components/History';
import { WordInput } from './components/WordInput';

import './App.css';

import { socket } from './socket';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

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
      {/* <div style={{lineHeight: "2em", fontSize: ".8em", paddingTop: "10px"}}>
        WAITING (-):
      </div> */}
      {/* {players.map(playerName => 
        <div 
          className={(turnId === playerName) ? "activePlayerName" : "playerName"}
          key={playerName}
        >
          {playerName}
        </div>
      )} */}
    </div>
  );
};

const Title = () => (
  <>
    <div className="title">WORD CHAIN</div>
    <div className="subtitle">ANIMALS EDITION</div>
  </>
);

const TitleLogo = () => (
  <div className="logo">
    <div className="title">WORD CHAIN</div>
    <div className="subtitle">ANIMALS EDITION</div>
  </div>
);


const GameSetup = ({ startFunc }: { startFunc: Function }) => { 
  return (
    <>
      <Title />
      <button
        className="startButton"
        onClick={() => startFunc()}
      >
        START GAME
      </button>
    </>
  );
};

const GameInProgress = ({ emitSubmit }: { emitSubmit: (newHistory: string[]) => void }) => { 
  return (
    <>
      <TitleLogo />
      <div className="mainContent">
        <History />
        <WordInput 
          emitFunc={emitSubmit}
        />
      </div>
    </>
  );
};

const GameWaiting = () => { 
  return (
    <>
      <TitleLogo />
      <div style={{color: "white"}}>
        Game is already in progress.
      </div>
    </>
  );
};


interface GameContextType {
  players: string[];
  turnClientId: string;
  yourTurn: boolean;
  history: Set<string>;
};

const initGameValues: GameContextType = {
  players: [],
  turnClientId: "",
  yourTurn: false,
  history: new Set(),
};

export const GameContext = createContext(initGameValues);

const App = () => {

  const [players, setPlayers] = useState<string[]>([]);
  // const [gameStarted, setGameStarted] = useState<boolean>(false);
  
  const [gameStatus, setGameStatus] = useState<"setup" | "started" | "waiting">("setup");

  const [turnClientId, setTurnClientId] = useState<string>("");
  const [yourTurn, setYourTurn] = useState<boolean>(false);
  const [history, setHistory] = useState<Set<string>>(new Set()); 

  useEffect(() => {
    // if other client joins lobby
    socket.on("playersChange", newPlayers => {
      setPlayers(newPlayers);
    });

    // if other client starts game
    socket.on("gameStarted", () => {
      setGameStatus("started");
    });

    // if game is ended
    socket.on("gameEnded", () => {
      setGameStatus("setup");
    });

    // if game has already started when joining
    socket.on("roomConnection", () => {
      setGameStatus("waiting");
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
    // setYourTurn(true);
  };

  const emitSubmit = (newHistory: string[]) => {
    setHistory(new Set(newHistory));
    setYourTurn(false);

    socket.emit("submit", newHistory);
  };

  const contextValue: GameContextType = {
    players,
    turnClientId,
    yourTurn,
    history,
  };

  const statusSwitch = () => {
    switch(gameStatus) {
      case "setup":
        return (
          // <TransitionGroup>
          //   <CSSTransition
          //     in={(gameStatus === "setup")}
          //     key="setup"
          //     classNames="slide"
          //     timeout={{ exit: 1000 }}
          //   >
              <GameSetup startFunc={startGame} />
          //   </CSSTransition>
          // </TransitionGroup>
        );
      case "started":
        return <GameInProgress emitSubmit={emitSubmit}/>;
      case "waiting":
        return <GameWaiting />;
      default:
        return <></>;
    }
  };

  return (
    <div className="app">
      <GameContext.Provider value={contextValue}>
        <PlayerPanel players={players} turnId={turnClientId}/>
        { statusSwitch() }
      </GameContext.Provider>
    </div>
  );
}

export default App;
