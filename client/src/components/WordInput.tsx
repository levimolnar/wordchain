import { useContext, useState } from "react";
import { SocketContext } from "../context/socket";
import { GameContext } from "../context/game";

const url = "https://api.gbif.org/v1/species/search"
const params = "?highertaxon_key=1&qField=VERNACULAR&limit=250&q="

export const WordInput = () => {

  const socket = useContext(SocketContext);
  const {
    // playerState: [players, setPlayers], 
    turnClientState: [turnClientId], 
    historyState: [history, setHistory],
  } = useContext(GameContext);

  const [submitDebounce, setSubmitDebounce] = useState<boolean>(false);
  const [wordError, setWordError] = useState<string>("");

  const toUniqueNames = (arr: Array<{vernacularName: string, language: string}>) => Array.from(new Set(arr.map(i => i.vernacularName.toUpperCase())));

  const validateAnimal = async (search: string) => {
    try {

      if (history.has(search)) { throw Error ("Animal name was already used.") }

      const response = await fetch([url, params, search].join(""));
      const { results } = await response.json();

      if (!results.length) { throw Error (`Could not find animal named "${search}".`) }

      const fetchedNames = results.map((a: any) => a.vernacularNames);
      const fetchedNamesSorted = fetchedNames.sort((a: any[], b: any[]) => a.length - b.length);
      const matchingNames = fetchedNamesSorted.find((arr: Array<{vernacularName: string, language: string}>) => {
        return arr.some(({ vernacularName, language }) => vernacularName.toUpperCase() === search && language === "eng")
      });

      if (!matchingNames) { throw Error (`Could not find animal named "${search}".`) }

      const matchingNamesEnglish = matchingNames.filter(({language}: {language: string}) => language === "eng");
      const matchingNamesUnique = toUniqueNames(matchingNamesEnglish);
  
      return matchingNamesUnique;

    } catch(err: any) { 
      if (err instanceof Error) {
        setWordError(err.toString().split(":")[1]);
        setTimeout(() => setWordError(""), 2000);
      };
    };
  };

  const submitSearch = (e: any) => {
    e.preventDefault();

    if (!submitDebounce) {
      setSubmitDebounce(true);
      setTimeout(async () => {

        const previousEndLetter = Array.from(history).at(-1)?.at(-1);
        const word = previousEndLetter ? previousEndLetter + e.target.animal.value : e.target.animal.value;

        const animalValidated = await validateAnimal(word.toUpperCase());
        // console.log("found:", animalValidated);

        if (animalValidated) {
          const newHistory = [...Array.from(history), word.toUpperCase()];
          setHistory(new Set(newHistory));
          // setYourTurn(false);      
          socket.emit("submit", newHistory);
          e.target.animal.value = "";
        };

        setSubmitDebounce(false);
      }, 30); 
    };
  };

  return (
    <form 
      className="wordForm"
      onSubmit={e => submitSearch(e)}
      autoComplete="off"
    >
      {
        turnClientId === socket.id
        ? <>
            <span className="firstLetter">
              {Array.from(history).at(-1)?.at(-1)}
            </span>
            <input 
              className="wordField"
              type="text" 
              name="animal"
              placeholder={history.size ? "" : "animal name (common)"}
            />
          </>
        : <div className="wordDisplay">
            <i>please wait your turn</i>
          </div>
      }
      <div className="error">
        {wordError}
      </div>
    </form>
  );
};