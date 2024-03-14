import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

// const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:3000",
//     methods: ["GET", "POST"],
//   },
// });

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: true,
  },
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});

const roomStorage: {
  [key: string]: {
    ids: string[],
    started: boolean, 
    turnIndex: number | undefined,
  },
} = {};

const getRoomSocketIds = (roomName: string): string[] => 
  Array.from(io.sockets.adapter.rooms.get(roomName) ?? new Set<string>());


io.on("connection", (socket) => {

  // data.currentRoomId


  // if (socket.recovered) { console.log("\n\nRECOVERY!") };

  socket.on("createRoom", (callback) => {
    let randomIdString: string;

    do {
      randomIdString = (+new Date * Math.random()).toString(36).substring(0,6);
    } while (roomStorage[randomIdString]);

    // store new room
    roomStorage[randomIdString] = {ids: [socket.id], started: false, turnIndex: undefined};
    socket.data.currentRoomId = randomIdString;

    // leave other rooms and join new room
    socket.rooms.forEach(id => socket.leave(id));
    socket.join(`${randomIdString}-lobby`);
    socket.join(`${randomIdString}-game`);

    callback({ roomId: randomIdString });
    // socket.emit("playerUpdate", [socket.id]);
    io.in(`${randomIdString}-lobby`).emit("playerUpdate", [socket.id]);

    console.log(`User "${socket.id}" created room "${randomIdString}".`);
    console.log("Active rooms:", Object.keys(roomStorage), Object.keys(roomStorage).length);
  });


  socket.on("joinRoom", (passedId: string, callback) => {
    if (!roomStorage[passedId]) {
      callback({ success: false });
      return;
    };
  
    // every client joins lobby room
    socket.join(`${passedId}-lobby`);
    socket.data.currentRoomId = passedId;
  
    // only clients that joined during game setup join game room
    if (!roomStorage[passedId].started) {
      socket.join(`${passedId}-game`);
      roomStorage[passedId].ids.push(socket.id);
  
      console.log(`Client "${socket.id}" joined "${passedId}" (GAME ROOM).`);
      callback({ success: true, status: "setup" });
    } else { 
      // socket.emit("gameInProgress");
      console.log(`Client "${socket.id}" joined "${passedId}" (LOBBY).`);
      callback({ success: true, status: "inProgress" });
    };
  
    // emit playerids in game to client
    const gameRoomIds = getRoomSocketIds(`${passedId}-game`);
    io.in(`${passedId}-lobby`).emit("playerUpdate", gameRoomIds);

    console.log("\nroomStorage:");
    console.log(roomStorage[passedId]);
  });


  socket.on("start", () => {
    console.log(`Client "${socket.id}" has started game at "${socket.data.currentRoomId}".`);

    io.in(`${socket.data.currentRoomId}-lobby`).emit("gameStarted");
    roomStorage[socket.data.currentRoomId].started = true;

    const gameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);
    const socketIndex = gameRoomIds.indexOf(socket.id);
    roomStorage[socket.data.currentRoomId].turnIndex = socketIndex;
    io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", undefined, gameRoomIds[socketIndex]);
  });

  socket.on("submit", (newWord: string) => {
    const gameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);
    const socketIndex = gameRoomIds.indexOf(socket.id);
    const nextIndex = (socketIndex + 1) % gameRoomIds.length;

    roomStorage[socket.data.currentRoomId].turnIndex = nextIndex;
    io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", {word: newWord, userId: socket.id, userNumber: socketIndex}, gameRoomIds[nextIndex]);
  });


  socket.on("disconnect", () => {
    console.log(`Client "${socket.id}" disconnected from "${socket.data.currentRoomId}".`);
    if (!socket.data.currentRoomId) { return };

    const newGameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);

    // remove room object if lobby empty
    if ( newGameRoomIds.length == 0) {
      console.log(`Room "${socket.data.currentRoomId}" was removed.`);
      console.log("Active rooms:", Object.keys(roomStorage), Object.keys(roomStorage).length);
      delete roomStorage[socket.data.currentRoomId];
      return;
    };

    // remove socket id from room object 
    const socketIndex = roomStorage[socket.data.currentRoomId].ids.indexOf(socket.id);
    roomStorage[socket.data.currentRoomId].ids.splice(socketIndex, 1);

    const newIndex = socketIndex % roomStorage[socket.data.currentRoomId].ids.length;

    // end game if one client left in room
    if ( newGameRoomIds.length < 2) {

      // move all clients to game room
      const lobbyRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-lobby`);
      lobbyRoomIds.forEach(id => 
        io.sockets.sockets.get(id)?.join(`${socket.data.currentRoomId}-game`)
      );
      io.in(`${socket.data.currentRoomId}-game`).emit("playerUpdate", lobbyRoomIds);
      io.in(`${socket.data.currentRoomId}-game`).emit("gameEnded");

      roomStorage[socket.data.currentRoomId] = {ids: lobbyRoomIds, started: false, turnIndex: undefined};
      return;
    };

    io.in(`${socket.data.currentRoomId}-lobby`).emit("playerUpdate", newGameRoomIds);

    // pass turn on if current player has turn while disconnecting  
    if (newIndex === (roomStorage[socket.data.currentRoomId].turnIndex! % roomStorage[socket.data.currentRoomId].ids.length)) {

      roomStorage[socket.data.currentRoomId].turnIndex = newIndex;
      io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", undefined, roomStorage[socket.data.currentRoomId].ids[newIndex]);

      // console.log("newIndex:", newIndex, roomStorage[socket.data.currentRoomId].ids, roomStorage[socket.data.currentRoomId].ids[newIndex]);
    };
  });
});


// io.on("reconnect", (socket) => {
//   console.log("\n\nRECONNECTION!", socket);
// });