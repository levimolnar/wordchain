import { useState } from "react";

// import { io } from 'socket.io-client';
// const socket = io("http://localhost:3001");

const url = "https://api.gbif.org/v1/species/search"
const params = "?highertaxon_key=1&qField=VERNACULAR&limit=250&q="

export const WordInput = ({
  history, 
  emitFunc,
  yourTurn,
}: {
  history: Set<string>, 
  emitFunc: (newHistory: string[]) => void,
  yourTurn: boolean,
}) => {

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
          const newHistory = new Set([...Array.from(history), word.toUpperCase()]);
          emitFunc(Array.from(newHistory));
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
        yourTurn
        ? <>
            <span className="firstLetter">
              {Array.from(history).at(-1)?.at(-1)}
            </span>
            <input 
              className="wordField"
              type="text" 
              name="animal"
              placeholder={history.size ? "" : "animal common name"}
            />
          </>
        : <div className="wordDisplay">
            <i>WAIT YOUR TURN...</i>
          </div>
      }
      <div className="error">
        {wordError}
      </div>
    </form>
  );
};