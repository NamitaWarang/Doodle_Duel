import React, { useRef, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import socket from "./socket";
import "./css/GamePage.css";

const GamePage = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState("#000000");
  const [isYourTurn, setIsYourTurn] = useState(false);
  const [currentDrawerId, setCurrentDrawerId] = useState(null);
  const [currentDrawerName, setCurrentDrawerName] = useState("");
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const location = useLocation();
  const [chosenWord, setChosenWord] = useState("");
  const [words, setWords] = useState([]);
  const [isChoosingWord, setIsChoosingWord] = useState(false);


  const wordOptions = ["apple", "bat", "car", "dog", "elephant", "fish", "house", "pizza", "robot", "sun"];


  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 500;

    const context = canvas.getContext("2d");
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.lineCap = "round";
    context.lineWidth = 5;
    contextRef.current = context;

    // socket.connect();
    socket.emit("request_canvas_data");

    socket.on("choose_word", (wordList) => {
      setWords(wordList);
      setIsChoosingWord(true);
    });

    socket.on("winner_announcement", ({ text, word }) => {
      alert(`${text} Word: ${word}`);
      setChosenWord(""); // Hide chosen word immediately
      setIsYourTurn(false); // Revoke controls before next turn is emitted
    });
    
    

    socket.on("drawing_data", ({ x, y, color, prevX, prevY }) => {
      const context = contextRef.current;
      context.strokeStyle = color;
      context.beginPath();
      context.moveTo(prevX, prevY);
      context.lineTo(x, y);
      context.stroke();
    });

    socket.on("canvas_data", (canvasURL) => {
      const img = new Image();
      img.src = canvasURL;
      img.onload = () => {
        context.drawImage(img, 0, 0);
      };
    });

    socket.on("your_turn", ({ isYourTurn, currentDrawerId, drawerName }) => {
      console.log("It's your turn to draw!");
      setIsYourTurn(isYourTurn);
      setCurrentDrawerId(currentDrawerId);
      setCurrentDrawerName(drawerName);

      if (!isYourTurn) {
        contextRef.current.prevX = null;
        contextRef.current.prevY = null;
        setChosenWord("");  // Hide the previous chosen word
        setIsChoosingWord(false);  // Ensure word selection modal disappears
      }
    });
    

    socket.on("clear_canvas", () => clearCanvasLocal());

    socket.on("turn_update", ({ currentDrawerId, drawerName }) => {
      setCurrentDrawerId(currentDrawerId);
      setCurrentDrawerName(drawerName);
    });

    // socket.on("round_over", () => {
    //   alert("Round over! Starting a new round.");
    // });

    const queryParams = new URLSearchParams(location.search);
    const name = queryParams.get("playerName");
    setPlayerName(name);
  
    // ✅ This line ensures player is registered on the server even if GamePage is loaded directly
    // socket.emit("join_lobby", name);

    socket.on("receive_message", (messageData) => {
      setMessages(prevMessages => [...prevMessages, messageData]);
    });


    return () => {
      socket.off("drawing_data");
      socket.off("canvas_data");
      socket.off("your_turn");
      socket.off("turn_update");
      socket.off("round_over");
      socket.off("receive_message");
      socket.off("clear_canvas");
      socket.off("choose_word");
      socket.off("winner_announcement");
    };
  }, []);

  // Clear the canvas locally (for all players)
  const clearCanvasLocal = () => {
    const canvas = canvasRef.current;
    const context = contextRef.current;
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "white";
    context.fillRect(0, 0, canvas.width, canvas.height);
  };

  // Emit a clear canvas event to the server
  const clearCanvas = () => {
    if (isYourTurn) {  // Only allow clearing if it's the player's turn
      socket.emit("clear_canvas");  // Emit event to server
    }
  };

  const handleWordSelection = (word) => {
    setChosenWord(word);
    setIsChoosingWord(false);
    socket.emit("word_chosen", word);
  };

  useEffect(() => {
    socket.on("clear_canvas", () => {
      clearCanvasLocal();  // Clear the canvas for all players when the event is received
    });

    return () => {
      socket.off("clear_canvas");
    };
  }, []);

  useEffect(() => {
    if (!isYourTurn) {
      setChosenWord("");  // Hide the word from previous drawer
    }
  }, [isYourTurn]);
  




  const draw = ({ nativeEvent }) => {
    if (!isDrawing || !isYourTurn) return;

    const { offsetX, offsetY } = nativeEvent;
    const context = contextRef.current;

    socket.emit("drawing", {
      x: offsetX,
      y: offsetY,
      prevX: context.prevX || offsetX,
      prevY: context.prevY || offsetY,
      color: color,
    });

    context.strokeStyle = color;
    context.beginPath();
    context.moveTo(context.prevX || offsetX, context.prevY || offsetY);
    context.lineTo(offsetX, offsetY);
    context.stroke();

    context.prevX = offsetX;
    context.prevY = offsetY;
  };

  const startDrawing = ({ nativeEvent }) => {
    if (!isYourTurn) return;

    const { offsetX, offsetY } = nativeEvent;
    setIsDrawing(true);
    contextRef.current.beginPath();
    contextRef.current.moveTo(offsetX, offsetY);

    contextRef.current.prevX = offsetX;
    contextRef.current.prevY = offsetY;
  };

  const finishDrawing = () => {
    if (!isYourTurn) return;

    setIsDrawing(false);
    contextRef.current.closePath();

    const canvas = canvasRef.current;
    const canvasURL = canvas.toDataURL();
    socket.emit("save_canvas", canvasURL);
  };

  const handleEndTurn = () => {
    if (isYourTurn) {
      socket.emit("end_turn");
      setIsYourTurn(false);  // Prevents drawing until the turn is reassigned
    }
  };


  // Emit message event


  const sendMessage = () => {
    if (message.trim() !== "") {
      const messageData = {
        playerName,
        text: message,
      };
      socket.emit("send_message", messageData);
      setMessage("");  // Clear the input field after sending
    }
  };




  return (
    <div className="game-page">
      {isChoosingWord && (
        <div className="word-selection">
          <h3>Select a word to draw:</h3>
          {words.map((word, index) => (
            <button key={index} onClick={() => handleWordSelection(word)}>
              {word}
            </button>
          ))}
        </div>
      )}

      {chosenWord && isYourTurn && (
        <div className="chosen-word">Your Word: {chosenWord}</div>
      )}

      <div className="toolbar">
        <button onClick={() => setColor("#000000")} style={{ backgroundColor: "#000000", color: "white" }}></button>
        <button onClick={() => setColor("#FF0000")} style={{ backgroundColor: "#FF0000" }}></button>
        <button onClick={() => setColor("#0000FF")} style={{ backgroundColor: "#0000FF" }}></button>
        <button onClick={() => setColor("#008000")} style={{ backgroundColor: "#008000" }}></button>
        <button onClick={() => setColor("#FFFF00")} style={{ backgroundColor: "#FFFF00" }}></button>
        {isYourTurn && (
          <>
            {/*<button onClick={clearCanvas} className="clear-canvas-btn">Clear Canvas</button>*/}
            <button onClick={clearCanvas} disabled={!isYourTurn} className="clear-canvas-btn">Clear Canvas</button>

          </>
        )}
      </div>

      <div className="canvas-container">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseUp={finishDrawing}
          onMouseMove={draw}
          onMouseLeave={finishDrawing}
        />
      </div>

      <div className="status">
        {isYourTurn ? (
          <div>Your Turn to Draw!</div>
        ) : (
          <div>Waiting for {currentDrawerName} to draw...</div>
        )}
      </div>

      <div className="chat-container">
        <div className="messages">
          {messages.map((msg, index) => (
            <div key={index}>
              <strong>{msg.playerName}:</strong> {msg.text}
            </div>
          ))}

        </div>
        <div className="message-input">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
          />
          <button onClick={sendMessage}>Send</button>
        </div>
      </div>
    </div>
  );
};

export default GamePage;