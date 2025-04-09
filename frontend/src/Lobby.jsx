
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import socket from "./socket";  // Importing the socket instance
import './css/Lobby.css';

const Lobby = () => {
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [joined, setJoined] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    socket.connect();

    socket.on("lobby_update", (players) => {
      setPlayers(players);
    });

    // socket.on("game_started", () => {  // Listen for game start broadcast from server
    //   console.log("Game Started!");
    //   navigate("/game");  
    // });



    return () => {
      socket.off("lobby_update");

    };
  }, [navigate]);

  const handleJoin = () => {
    if (playerName.trim() !== "" && !joined) {
      socket.emit("join_lobby", playerName);
      setJoined(true);
    }
  };

  const handleStartGame = () => {
    socket.emit("start_game");  //  Only emit event, don't navigate here
    // navigate("/game");
    navigate(`/game?playerName=${encodeURIComponent(playerName)}`); // Pass playerName as URL param

  };

  return (
    <div className="lobby-container">
      <h1>Lobby</h1>
      {!joined && (
        <>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
          />
          <button onClick={handleJoin}>Join Lobby</button>
        </>
      )}

      <h2>Players in Lobby:</h2>
      <ul>
        {players.map((player) => (
          <li key={player.id}>{player.name}</li>
        ))}
      </ul>

      <button
        onClick={handleStartGame}
        disabled={players.length <= 1}
      >
        Let's Play
      </button>
    </div>
  );
};

export default Lobby;
