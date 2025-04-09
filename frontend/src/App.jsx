import React from "react";
import { Routes, Route } from "react-router-dom";
import Lobby from "./Lobby";
import GamePage from "./GamePage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<Lobby />} />
      <Route path="/game" element={<GamePage />} />
    </Routes>
  );
};

export default App;
