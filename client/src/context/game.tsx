import { createContext, useState } from 'react';

interface GameContextType {
  roomState: [string, React.Dispatch<React.SetStateAction<string>>];
  playerState: [string[], React.Dispatch<React.SetStateAction<string[]>>];
  turnClientState: [string, React.Dispatch<React.SetStateAction<string>>];
  // historyState: [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>];
  historyState: [Map<string, {userId: string, userNumber: number}>, React.Dispatch<React.SetStateAction<Map<string, {userId: string, userNumber: number}>>>];
};

export const GameContext = createContext<GameContextType>({
  roomState: ["", () => {}],
  playerState: [[], () => {}],
  turnClientState: ["", () => {}],
  historyState: [new Map(), () => {}],
});

export const GameProvider = ({ children }: any) => {

  // const [players, setPlayers] = useState<string[]>([]);
  // const [turnClientId, setTurnClientId] = useState<string>("");
  // const [history, setHistory] = useState<Set<string>>(new Set()); 

  // const contextValue: GameContextType = {
  //   playerState: [players, setPlayers],
  //   turnClientState: [turnClientId, setTurnClientId],
  //   historyState: [history, setHistory],
  // };

  const roomState       = useState<string>("");
  const playerState     = useState<string[]>([]);
  const turnClientState = useState<string>("");
  // const historyState    = useState<Set<string>>(new Set()); 
  const historyState    = useState<Map<string, {userId: string, userNumber: number}>>(new Map()); 

  const contextValue: GameContextType = {
    roomState,
    playerState,
    turnClientState,
    historyState,
  };

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  )
};