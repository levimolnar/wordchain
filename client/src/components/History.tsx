import { useEffect, useRef, useState } from "react";
import { CSSTransition, TransitionGroup } from "react-transition-group";

const HistoryItem = ({
  length, 
  index, 
  word,
}: {
  length: number, 
  index: number, 
  word: string,
}) => {

  const reverseIndex = length - index;
  const isLast = (index === length - 1);

  const itemStyle: any = {
    opacity: 1 / Math.sqrt(reverseIndex),
    fontWeight: 600 / Math.sqrt(reverseIndex),
    fontSize: `${2 / Math.cbrt(reverseIndex)}em`,
    lineHeight: "1em",
    color: isLast ? "#18ad5e" : "white",
    transition: "all 300ms ease-out",

    width: "max-content",
    // backgroundColor: "red",
  };

  return (
    <div style={itemStyle} className="wobble">
      {word}
    </div>
  );
};

export const History = ({history}: {history: Set<string>}) => (
  <div className="history">
    <TransitionGroup>
      { 
        Array.from(history).map((word, index) => (
          <CSSTransition
            key={word}
            classNames="slide"
            timeout={{ enter: 1000 }}
          >
            <HistoryItem 
              key={`history-${index}`}
              length={history.size}
              index={index}
              word={word}
            />
          </CSSTransition>
        ))
      }
    </TransitionGroup>
  </div>
);