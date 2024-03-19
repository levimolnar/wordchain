import { useContext, useEffect, useState } from 'react';
import { History } from './components/History';
import { WordInput } from './components/WordInput';

import './App.css';
import { SocketContext } from './context/socket';
import { GameContext } from './context/game';

// import { CSSTransition, TransitionGroup } from 'react-transition-group';

const PlayerPanel = ({ players, turnId }: { players: string[], turnId: string }) => { 

  const socket = useContext(SocketContext);

  if (!players.length) return (
    <div className="playerPanel">
      unconnected
    </div>
  );

  return (
    <div className="playerPanel">
      <b style={{lineHeight: "2em", fontSize: ".8em"}}>
        ROOM ({players.length}):
      </b>
      {players.map((playerName, index)=> 
        <div 
          className={(playerName === turnId) ? "activePlayerName" : "playerName"}
          key={playerName}
        >
          {(playerName === turnId) ? "●\xa0" : "\xa0\xa0"} 
          PLAYER {index + 1}
          {(playerName === socket.id) ? "\xa0(you)" : ""}
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


const RoomDisplay = () => {

  const socket = useContext(SocketContext);
  const { roomState: [roomId, setRoomId] } = useContext(GameContext);

  return (
    <div className="roomDisplay">
      {
        roomId
        ? (
          <div
            className="roomIdDisplay"
          >
            {/* molnar.dev/wordchain?{roomId} */}
            https://chaingame.pages.dev/?{roomId}
          </div>
        )
        : (
          <button
            className="roomButton"
            onClick={() => {
              socket.emit("createRoom", (response: {roomId: string}) => {
                setRoomId(response.roomId);
                window.history.replaceState(null, "", `?${response.roomId}`);
              });
            }}
          >
            CREATE ROOM
          </button>
        )
      }
    </div>
  );
}

const GameSetup = ({ startFunc }: { startFunc: Function }) => { 
  return (
    <>
      <Title />
      <div style={{
        display: "flex", 
        width: "50%", 
        // backgroundColor: "#ff000055",
        gap: "30px",
      }}>
        <button
          className="startButton"
          onClick={() => startFunc()}
        >
          START GAME
        </button>
        <RoomDisplay />
      </div>
    </>
  );
};

const GameInProgress = () => { 
  return (
    <>
      <TitleLogo />
      {/* <div className="mainContent"> */}
      <History />
      <WordInput />
      {/* </div> */}
    </>
  );
};

const GameWaiting = () => { 
  return (
    <>
      <TitleLogo />
      <div style={{color: "white"}}>
        Game already in progress. Stay in this lobby to join when it ends.
      </div>
    </>
  );
};

const App = () => {

  const socket = useContext(SocketContext);
  const {
    roomState: [roomId, setRoomId],
    playerState: [players, setPlayers], 
    turnClientState: [turnClientId, setTurnClientId], 
    historyState: [, setHistory],
  } = useContext(GameContext);

  // const [roomId, setRoomId] = useState<string[]>([]);
  const [gameStatus, setGameStatus] = useState<"setup" | "started" | "waiting">("setup");
  useEffect(() => {

    // join room if url contains room id parameter
    const urlString = window.location.search.slice(1);
    if (urlString) { 
      socket.emit("joinRoom", urlString, (response: any) => {
        if (response.success) {
          setRoomId(urlString);
          // if (response.status === "setup") { 
          //   setGameStatus("setup");
          //   console.log(`Joined room "${urlString}".`)
          // };
          if (response.status === "inProgress") { 
            setGameStatus("waiting"); 
            console.log("Game is already in progress.");
          };
        } else {
          // console.log(`Failed to join room "${urlString}"`);
          window.history.pushState(null, "", window.location.href.split("?")[0]);
        };
      });
    };

    socket.on("playerUpdate", newPlayers => setPlayers(newPlayers));
    socket.on("gameStarted", () => setGameStatus("started"));
    socket.on("gameEnded", () => {
      setGameStatus("setup");
      setHistory(new Map());
    });

    socket.on("nextTurn", (newWordObj, turnId) => {
      if (newWordObj) { setHistory(prev => new Map([...Array.from(prev), [newWordObj.word, {userId: newWordObj.userId, userNumber: newWordObj.userNumber}]])) };
      setTurnClientId(turnId);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // start game
  const startGame = () => { 
    if (roomId) {
      socket.emit("start") ;
    } else {
      console.log("Cannot start game without joining room.");
    }
  };

  const statusSwitch = () => {
    switch(gameStatus) {
      case "setup":
        return <GameSetup startFunc={startGame} />;
      case "started":
        return <GameInProgress />;
      case "waiting":
        return <GameWaiting />;
      default:
        return <></>;
    }
  };

  return (
    <div className="app">
      <PlayerPanel players={players} turnId={turnClientId}/>
      { statusSwitch() }
    </div>
  );
}

export default App;
