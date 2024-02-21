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

io.on("connection", (socket: any) => {
  socket.join("roomId");
  const socketIds: string[] = Array.from(io.sockets.adapter.rooms.get("roomId")!);
  io.emit("playersChange", socketIds);
  console.log(`${socket.id} connected to ${"roomId"}`);

  socket.on('disconnect', function(){
    const socketSet: Set<string> | undefined = io.sockets.adapter.rooms.get("roomId");
    const socketIds2: string[] = socketSet ? Array.from(socketSet) : [];
    io.emit("playersChange", socketIds2);
    console.log(`${socket.id} disconnected from to ${"roomId"}`);
  });
});

io.on("connection", (socket: any) => {
  socket.on("start", () => {
    console.log(`${socket.id} has started the game.`);
    io.emit("gameStarted");
  });

  socket.on("submit", (history: string[]) => {
    const socketIds: string[] = Array.from(io.sockets.adapter.rooms.get("roomId")!);
    const turnIndex = socketIds.indexOf(socket.id);
    const nextIndex = (turnIndex + 1) % socketIds.length;

    socket.to("roomId").emit("turnInfo", history, nextIndex);
  });
});