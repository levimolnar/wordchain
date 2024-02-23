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

// io.on("connection", (socket: any) => {
//   console.log("user connected:", socket.id);
//   socket.on("animal", (name: string) => {
//     console.log(name);
//   });
// });

const roomObj: {[key: string]: boolean} = {};

io.on("connection", (socket: any) => {

  // if game is already started don't allow client to join
  if (roomObj["roomId"]) {
    socket.emit("roomConnection", false);
    return;
  };

  socket.join("roomId");
  socket.emit("roomConnection", true);

  const socketIds: string[] = Array.from(io.sockets.adapter.rooms.get("roomId")!);
  console.log(`${socket.id} connected to ${"roomId"}`, roomObj["roomId"]);
  io.emit("playersChange", socketIds);

  socket.on("disconnect", () => {
    console.log(`${socket.id} disconnected from to ${"roomId"}`);

    const socketSet: Set<string> = io.sockets.adapter.rooms.get("roomId") ?? new Set<string>();
    const socketIds: string[] = Array.from(socketSet);
    io.emit("playersChange", socketIds);

    // end game if lobby empty
    if ( socketSet.size < 2) {
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

    const socketIds: string[] = Array.from(io.sockets.adapter.rooms.get("roomId")!);
    const turnIndex = socketIds.indexOf(socket.id);
    io.emit("turnInfo", [], socketIds[turnIndex]);
  });

  socket.on("submit", (history: string[]) => {
    const socketIds: string[] = Array.from(io.sockets.adapter.rooms.get("roomId")!);
    const turnIndex = socketIds.indexOf(socket.id);
    const nextIndex = (turnIndex + 1) % socketIds.length;
    // socket.to("roomId").emit("turnInfo", history, socketIds[nextIndex]);
    io.emit("turnInfo", history, socketIds[nextIndex]);
  });
});