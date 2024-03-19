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
    historyState: [history],
  } = useContext(GameContext);

  const [submitDebounce, setSubmitDebounce] = useState<boolean>(false);
  const [wordError, setWordError] = useState<string>("");

  // const toUniqueNames = (arr: Array<{vernacularName: string, language: string}>) => Array.from(new Set(arr.map(i => i.vernacularName.toUpperCase())));

  // const validateAnimal = async (search: string) => {
  //   try {

  //     if (history.has(search)) { throw Error ("Animal name was already used.") }

  //     // fetch animals where vernacular name contains search
  //     const response = await fetch([url, params, search].join(""));
  //     const { results } = await response.json();

  //     console.log(results);

  //     if (!results.length) { throw Error (`Could not find animal named "${search}".`) }

  //     // find exact match of vernacular name
  //     const fetchedNames = results.map((a: any) => a.vernacularNames);
  //     const fetchedNamesSorted = fetchedNames.sort((a: any[], b: any[]) => a.length - b.length);
  //     const matchingNames = fetchedNamesSorted.find((arr: Array<{vernacularName: string, language: string}>) => {
  //       return arr.some(({ vernacularName, language }) => vernacularName.toUpperCase() === search && language === "eng")
  //     });

  //     if (!matchingNames) { throw Error (`Could not find animal named "${search}".`) }

  //     // get all english vernacular names of found animal
  //     const matchingNamesEnglish = matchingNames.filter(({language}: {language: string}) => language === "eng");
  //     const matchingNamesUnique = toUniqueNames(matchingNamesEnglish);
  
  //     return matchingNamesUnique;

  //   } catch(err: any) { 
  //     if (err instanceof Error) {
  //       setWordError(err.toString().split(":")[1]);
  //       setTimeout(() => setWordError(""), 2000);
  //     };
  //   };
  // };

  const validateAnimal = async (search: string) : Promise<{sname: string, vnames: string[]} | undefined> => {
    try {
      if (history.has(search)) { throw Error("Animal name was already used."); }
  
      // fetch animals where vernacular name contains search
      const response = await fetch([url, params, search].join(""));
      const { results } = await response.json();
  
      // console.log(results);
  
      if (!results.length) { throw Error(`Could not find animal named "${search}".`); }
  
      // find exact match of vernacular name
      const matchingAnimal = results.find((animal: any) => {
        const matchingVernacularName = animal.vernacularNames.find((name: any) => {
          return name.vernacularName.toUpperCase() === search && name.language === "eng";
        });
        return matchingVernacularName !== undefined;
      });
  
      if (!matchingAnimal) { throw Error(`Could not find animal named "${search}".`); }
  
      // get all english vernacular names and scientific name of the found animal
      const matchingVernacularNamesEnglish = matchingAnimal.vernacularNames
        .filter(({ language }: { language: string }) => language === "eng")
        .map(({ vernacularName }: { vernacularName: string }) => vernacularName);
      const scientificName = matchingAnimal.scientificName;
  
      return { sname: scientificName.split(/[\s,]+/).slice(0,2).join(" "), vnames: matchingVernacularNamesEnglish };
  
    } catch (err: any) {
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

        const endLetter = Array.from(history).at(-1)?.[0]?.at(-1);
        const word = endLetter ? endLetter + e.target.animal.value : e.target.animal.value;

        const animalValidated = await validateAnimal(word.toUpperCase());

        if (animalValidated) {
          console.log(animalValidated?.sname);
          socket.emit("submit", word.toUpperCase());
          e.target.animal.value = "";
        };

        setSubmitDebounce(false);
      }, 30); 
    };
  };

  // console.log(history, history.size);

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
              { history.size ? Array.from(history).at(-1)?.[0]?.at(-1) : "" }
            </span>
            <input 
              className="wordField"
              type="text" 
              name="animal"
              placeholder={history.size ? "..." : "animal name (common)"}
            />
          </>
        : <div className="wordDisplay">
            <i>Wait for other players to finish turn ...</i>
          </div>
      }
      <div className="error">
        {wordError}
      </div>
    </form>
  );
};