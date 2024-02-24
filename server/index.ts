import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);

// const io = new Server(server);
// const io = new Server(server, {
//   connectionStateRecovery: {}
// });

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

server.listen(3001, () => {
  console.log("server running at http://localhost:3001");
});

const roomObj: {[key: string]: boolean} = {};

const getRoomSocketIds = (roomName: string): string[] => 
  Array.from(io.sockets.adapter.rooms.get(roomName) ?? new Set<string>());

io.on("connection", (socket: any) => {

  // every client joins lobby room
  socket.join("roomId-lobby");

  // only clients that joined during game setup join game room
  if (!roomObj["roomId"]) {
    socket.join("roomId-game");
  } else { 
    socket.emit("roomConnection", false) 
  };

  // emit playerids in game to client
  const gameRoomIds = getRoomSocketIds("roomId-game");
  io.emit("playersChange", gameRoomIds);

  socket.on("disconnect", () => {
    // console.log(`${socket.id} disconnected from to ${"roomId-game"}`);

    // const newGameRoomIds = gameRoomIds.filter(id => id !== socket.id);
    const newGameRoomIds = getRoomSocketIds("roomId-game");
    io.emit("playersChange", newGameRoomIds);

    // end game if lobby empty
    if ( newGameRoomIds.length < 2) {

      const lobbyRoomIds = getRoomSocketIds("roomId-lobby");
      lobbyRoomIds.forEach(id => io.sockets.sockets.get(id)?.join("roomId-game"));
      io.emit("playersChange", lobbyRoomIds);
      io.emit("gameEnded");
      roomObj["roomId"] = false;
      return;
    };

    // if current player has turn while disconnecting pass turn on
  });

  socket.on("start", () => {
    console.log(`${socket.id} has started the game.`);

    io.emit("gameStarted");
    roomObj["roomId"] = true;

    const gameRoomIds = getRoomSocketIds("roomId-game");
    const turnIndex = gameRoomIds.indexOf(socket.id);
    io.emit("turnInfo", [], gameRoomIds[turnIndex]);
  });

  socket.on("submit", (history: string[]) => {
    const gameRoomIds = getRoomSocketIds("roomId-game");
    const turnIndex = gameRoomIds.indexOf(socket.id);
    const nextIndex = (turnIndex + 1) % gameRoomIds.length;
    io.emit("turnInfo", history, gameRoomIds[nextIndex]);
  });
});