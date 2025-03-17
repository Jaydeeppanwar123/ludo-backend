const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.get("/", (req, res) => res.send("Ludo Backend is Running!"));

let waitingPlayers = [];
let games = {};

io.on("connection", (socket) => {
    console.log(`Player connected: ${socket.id}`);
    waitingPlayers.push(socket);

    if (waitingPlayers.length >= 4) {
        const players = waitingPlayers.splice(0, 4);
        const roomId = `room-${players[0].id}`;

        games[roomId] = { players: players.map(p => p.id), turn: 0, positions: {} };
        players.forEach(player => {
            games[roomId].positions[player.id] = 0;
            player.join(roomId);
            player.emit("gameStart", { roomId, players: games[roomId].players });
        });

        io.to(roomId).emit("turn", { currentPlayer: games[roomId].players[0] });
    }

    socket.on("rollDice", ({ roomId }) => {
        if (!games[roomId]) return;

        const diceRoll = Math.floor(Math.random() * 6) + 1;
        const currentPlayer = games[roomId].players[games[roomId].turn];

        games[roomId].positions[currentPlayer] += diceRoll;
        io.to(roomId).emit("diceRolled", { player: currentPlayer, diceRoll, newPosition: games[roomId].positions[currentPlayer] });

        games[roomId].turn = (games[roomId].turn + 1) % 4;
        io.to(roomId).emit("turn", { currentPlayer: games[roomId].players[games[roomId].turn] });
    });

    socket.on("disconnect", () => console.log(`Player disconnected: ${socket.id}`));
});

server.listen(3000, () => console.log("✅ Server running on port 3000"));
