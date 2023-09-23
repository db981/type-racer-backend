const { v4: uuidv4 } = require('uuid');

const io = require("socket.io")({
  cors: {
    origin: ["http://localhost:3000", "http://10.0.2.15:3000"],
    methods: ["GET", "POST"]
  }
});

let queue = [];
let activeGames = {};

module.exports.io = io;
io.on("connection", (socket) => {
  console.log("New connection id: " + socket.id);
  queue.push(socket);
  if (queue.length >= 2) {
    scheduleGame();
  }
  socket.on("disconnect", () => {
    console.log("Connection destroyed id: " + socket.id);
    for(let i = 0; i < queue.length; i++){
      if(queue[i].id = socket.id){
        queue.splice(i, 1);
      }
    }
  });
  socket.on("report_player_progress", (data) => {
    let game = activeGames[data.gameId];
    game.participants[socket.id].progress = data.playerProgress;
    game.participants[socket.id].wpm = data.wpm;
    for (const id in activeGames[data.gameId].participants) {
      if (!(id == socket.id)) { //dont send update to user who reported progress
        io.to(id).emit('report_participant_progress', activeGames[data.gameId].participants);
      }
    }
  });
  socket.on("player_finished", (data) => {
    let game = activeGames[data.gameId];
    game.podium.push(socket.id);
    io.to(socket.id).emit('report_player_result', game.podium.length);
  });
});

const scheduleGame = () => {
  let participants = {};
  queue.splice(0, 2).forEach((participant) => {
    participants[participant.id] = {progress: 0, wpm: 0};
  });
  let gameId = uuidv4();
  let gameStartTime = Date.now() + 5000;
  activeGames[gameId] = { participants, gameStartTime, podium: [] };
  for (const id in activeGames[gameId].participants) {
    io.to(id).emit('schedule_online_game', { gameId, id, gameStartTime, participants: activeGames[gameId].participants});
  }
}