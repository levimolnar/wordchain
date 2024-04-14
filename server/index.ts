import express from "express";
import { createServer } from "node:http";
// import { join } from "node:path";
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
    maxDisconnectionDuration: 120_000,
    // skipMiddlewares: true,
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

  // SOCKET VARIABLES:
  //   data.currentRoomId - Room ID to fetch more information about room from roomStorage object.
  //   data.timer         - Timeout instance that's created every round.

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
  });


  socket.on("start", () => {
    console.log(`Client "${socket.id}" has started game at "${socket.data.currentRoomId}".`);

    roomStorage[socket.data.currentRoomId].started = true;

    const gameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);
    const socketIndex = gameRoomIds.indexOf(socket.id);
    roomStorage[socket.data.currentRoomId].turnIndex = socketIndex;

    io.in(`${socket.data.currentRoomId}-lobby`).emit("gameStarted");
    io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", undefined, gameRoomIds[socketIndex]);
  });

  socket.on("setTimer", (callback) => {
    console.log(`Timeout started for user ${socket.id}.`);
    socket.data.timer = setTimeout(() => {

      // disconnect user if they failed to name animal in time
      console.log(`Client ${socket.id} failed to name animal in time.`);
      // socket.emit("gameLost");

      socket.leave(`${socket.data.currentRoomId}-game`);
      const newGameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);

      // remove socket id from room object
      const socketIndex = roomStorage[socket.data.currentRoomId].ids.indexOf(socket.id);
      roomStorage[socket.data.currentRoomId].ids.splice(socketIndex, 1);
  
      // end game (win condition) if one client left in room
      if ( newGameRoomIds.length < 2) {
 
        // move all clients in lobby to game room
        const lobbyRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-lobby`);
        lobbyRoomIds.forEach(id => {
          io.sockets.sockets.get(id)?.join(`${socket.data.currentRoomId}-game`);
        });

        io.in(`${socket.data.currentRoomId}-game`).emit("gameEnded");
        io.in(`${socket.data.currentRoomId}-game`).emit("playerUpdate", lobbyRoomIds);

        roomStorage[socket.data.currentRoomId] = {ids: lobbyRoomIds, started: false, turnIndex: undefined};
        
        return;
      };

      const newIndex = socketIndex % roomStorage[socket.data.currentRoomId].ids.length;

      // pass turn on to next player
      roomStorage[socket.data.currentRoomId].turnIndex = newIndex;
      io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", undefined, roomStorage[socket.data.currentRoomId].ids[newIndex]);
  
      io.in(`${socket.data.currentRoomId}-lobby`).emit("playerUpdate", newGameRoomIds);

      callback();
  
    }, 30_000);
  });

  socket.on("submit", (newWord: string) => {

    clearTimeout(socket.data.timer);
    socket.data.timer = undefined;
    
    const gameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);
    const socketIndex = gameRoomIds.indexOf(socket.id);
    const nextIndex = (socketIndex + 1) % gameRoomIds.length;
    roomStorage[socket.data.currentRoomId].turnIndex = nextIndex;

    // next turn emit goes to all players, contains submission and next player id 
    io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", {word: newWord, userId: socket.id, userNumber: socketIndex}, gameRoomIds[nextIndex]);
    io.to(gameRoomIds[nextIndex]).emit("turnStart");
  });


  socket.on("disconnect", () => {
    console.log(`Client "${socket.id}" disconnected from "${socket.data.currentRoomId}".`);
    if (!socket.data.currentRoomId) { return };

    clearTimeout(socket.data.timer);
    socket.data.timer = undefined;

    const newGameRoomIds = getRoomSocketIds(`${socket.data.currentRoomId}-game`);

    // remove room object if lobby empty
    if ( newGameRoomIds.length == 0) {
      delete roomStorage[socket.data.currentRoomId];

      console.log(`Room "${socket.data.currentRoomId}" was removed.`);
      console.log("Active rooms:", Object.keys(roomStorage), Object.keys(roomStorage).length);

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

      io.in(`${socket.data.currentRoomId}-game`).emit("gameEnded");
      io.in(`${socket.data.currentRoomId}-game`).emit("playerUpdate", lobbyRoomIds);

      roomStorage[socket.data.currentRoomId] = {ids: lobbyRoomIds, started: false, turnIndex: undefined};

      return;
    };

    io.in(`${socket.data.currentRoomId}-lobby`).emit("playerUpdate", newGameRoomIds);

    // pass turn on if current player has turn while disconnecting  
    if (newIndex === (roomStorage[socket.data.currentRoomId].turnIndex! % roomStorage[socket.data.currentRoomId].ids.length)) {

      roomStorage[socket.data.currentRoomId].turnIndex = newIndex;
      io.in(`${socket.data.currentRoomId}-game`).emit("nextTurn", undefined, roomStorage[socket.data.currentRoomId].ids[newIndex]);
    };
  });
});
