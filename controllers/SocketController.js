const { v4: uuidv4 } = require('uuid');

const io = require("socket.io")({
  cors: {
    origin: ["http://localhost:3000", "http://10.0.2.15:3000"],
    methods: ["GET", "POST"]
  }
});

let gamePrompts = ["Test"];
/*let gamePrompts = ["You do not have to sit outside in the dark. If, however, you want to look at the stars, you will find that darkness is necessary. But the stars neither require nor demand it.",
"For all its apparent strength, the Aztec Empire had vulnerabilities that the Spanish were able to exploit. The tiny Spanish force was able to attract a massive army of some 30,000 Mesoamericans of many different tribes.",
"Imagine this: Here we are, a plane full of grown human beings, many of us partially educated, and they're actually taking time out to describe the intricate workings of a belt buckle. Well, I ask for clarification at that point. Did you say 'Place the small metal flap into the buckle' or 'Place the buckle over and around the small metal flap'?"];
*/
const getRandomPrompt = () => {
  return gamePrompts[Math.floor(Math.random() * gamePrompts.length)];
}

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
      if(queue[i].id == socket.id){
        console.log("splicing");
        queue.splice(i, 1);
      }
    }
  });
  socket.on("report_player_progress", (data) => {
    let game = activeGames[data.gameId];
    game.participants[socket.id].progress = data.playerProgress;
    game.participants[socket.id].wordsTyped = data.wordsTyped;
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
    if(game.podium.length == Object.keys(game.participants).length){ //game concluded
      delete(activeGames[data.gameId]);
    }
  });
});

const scheduleGame = () => {
  let participants = {};
  queue.splice(0, 2).forEach((participant) => {
    participants[participant.id] = {progress: 0, wordsTyped: 0};
  });
  let gameId = uuidv4();
  let gameStartTime = Date.now() + 5000;
  let prompt = getRandomPrompt();
  activeGames[gameId] = { prompt, participants, gameStartTime, podium: [] };
  for (const id in activeGames[gameId].participants) {
    io.to(id).emit('schedule_online_game', { gameId, id, prompt, gameStartTime, participants: activeGames[gameId].participants});
  }
}