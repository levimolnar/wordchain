  import { useContext } from "react";
  import { CSSTransition, TransitionGroup } from "react-transition-group";
  import { GameContext } from "../context/game";
  import { SocketContext } from "../context/socket";

  const HistoryItem = ({
    word,
    user: {userId, userNumber},
  }: {
    word: string,
    user: {userId: string, userNumber: number}
  }) => {

    const socket = useContext(SocketContext);
    const isUser = (userId === socket.id);

    return (
      <div className="historyRow" style={{backgroundColor: isUser ? "#00B050": ""}}>
        <div className="historyPlayerNumber" style={{backgroundColor: isUser ? "#00B050" : "#333", color: isUser ? "#000" : "#fff"}}>
          P{userNumber + 1}
        </div>
        <div className="historyWord" style={{backgroundColor: isUser ? "#24d574" : "#444", color: isUser ? "#000" : "#fff"}}>
          {word.toLowerCase()}
        </div>
      </div>
    );
  };

  export const History = () => {

    const {
      // playerState: [players, setPlayers], 
      // turnClientState: [turnClientId, setTurnClientId], 
      historyState: [history],
    } = useContext(GameContext);

    return (
      <div className="history">
        <div style={{position: "absolute", width: "100%", height: "100%", background: "linear-gradient(#111 20%, transparent 66%)"}}/>
        <TransitionGroup>
          { 
            Array.from(history).map(([word, user], index) => (
              <CSSTransition
                key={word}
                classNames="slide"
                timeout={{ enter: 1000 }}
              >
                <HistoryItem 
                  key={`history-${index}`}
                  word={word}
                  user={user}
                />
              </CSSTransition>
            ))
          }
        </TransitionGroup>
      </div>
    )
  };