const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let players = [];
let savedCanvasData = null;
let currentDrawerIndex = -1;  // Initially, no drawer is assigned
let roundCount = 0;
const availableWords = ["apple", "bat", "car", "dog", "elephant", "fish", "house", "pizza", "robot", "sun"];
let currentWord = "";


io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("join_lobby", (playerName) => {
    if (!players.find(player => player.id === socket.id)) {
      players.push({ id: socket.id, name: playerName });
      io.emit("lobby_update", players);

      if (savedCanvasData) {
        socket.emit("canvas_data", savedCanvasData);
      }
    }
  });

  socket.on("start_game", () => {
    if (players.length > 0) {
      currentDrawerIndex = Math.floor(Math.random() * players.length);  // Random drawer selection
      roundCount = 0;
      // io.emit("game_started");
      assignNextTurn();
    }
  });

  socket.on("send_message", (messageData) => {
    io.emit("receive_message", messageData);
  
    if (currentWord && messageData.text.toLowerCase() === currentWord.toLowerCase()) {
      io.emit("winner_announcement",{ text: `🎉 ${messageData.playerName} guessed the word correctly!`, word: currentWord});
      
      currentWord = "";  // Reset word after it's guessed
      assignNextTurn();  // Move to the next player's turn
    }
  });

  socket.on("next_turn", () => {
    assignNextTurn();
  });
  
  

  // socket.on("end_turn", () => {
  //   if (players[currentDrawerIndex] && players[currentDrawerIndex].id === socket.id) {
  //     roundCount++;

  //     if (roundCount >= players.length) {
  //       io.emit("round_over");
  //       roundCount = 0;
  //     } else {
  //       assignNextTurn();
  //     }
  //   }
  // });

  socket.on("drawing", (data) => {
    const drawer = players[currentDrawerIndex];
    if (drawer && drawer.id === socket.id) {
      socket.broadcast.emit("drawing_data", data);
    }
  });

  socket.on("save_canvas", (canvasURL) => {
    savedCanvasData = canvasURL;
  });

   // Listen for clear canvas event from the drawer
   socket.on("clear_canvas", () => {
    console.log("Clearing canvas for all clients");
    io.emit("clear_canvas");  // Broadcast to all clients
});
  

  socket.on("request_canvas_data", () => {
    if (savedCanvasData) {
      socket.emit("canvas_data", savedCanvasData);
    }
  });

  socket.on("word_chosen", (word) => {
    if (players[currentDrawerIndex] && players[currentDrawerIndex].id === socket.id) {
      currentWord = word;
      console.log(`Word chosen by ${players[currentDrawerIndex].name}: ${currentWord}`);
    }
  });

 
  socket.on("disconnect", () => {
    console.log("A user disconnected:", socket.id);
    players = players.filter(player => player.id !== socket.id);

    if (players.length === 0) {
      currentDrawerIndex = -1;
      savedCanvasData = null;
    } else if (currentDrawerIndex >= players.length) {
      currentDrawerIndex = 0;
    }

    io.emit("lobby_update", players);
  });

  const assignNextTurn = () => {
    currentDrawerIndex = (currentDrawerIndex + 1) % players.length;
    const currentDrawer = players[currentDrawerIndex];
  
    const wordList = availableWords.sort(() => 0.5 - Math.random()).slice(0, 3);
    currentWord = "";
  
  
  
    // Notify all others that it's not their turn
    players.forEach(player => {
      if (player.id !== currentDrawer.id) {
        io.to(player.id).emit("your_turn", {
          isYourTurn: false,
          currentDrawerId: currentDrawer.id,
          drawerName: currentDrawer.name,
        });
      }
    });
      // Emit true only to the current drawer
      io.to(currentDrawer.id).emit("your_turn", { 
        isYourTurn: true,
        currentDrawerId: currentDrawer.id,
        drawerName: currentDrawer.name,
      });
  
    // Send word selection options only to the drawer
    io.to(currentDrawer.id).emit("choose_word", wordList);
  };
  
  
  
});

server.listen(5000, () => {
  console.log("Server is running on port 5000");
});

