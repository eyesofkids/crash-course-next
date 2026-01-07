
import React, { useState } from "react";
import "./App.css";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [result, setResult] = useState(0);

  // Helper to safely convert the current input to a number
  const getNumberFromInput = () => {
    const value = Number(inputValue);
    if (Number.isNaN(value)) {
      return 0;
    }
    return value;
  };

  const handleChange = (event) => {
    setInputValue(event.target.value);
  };

  const add = () => {
    const number = getNumberFromInput();
    setResult((prev) => prev + number);
  };

  const subtract = () => {
    const number = getNumberFromInput();
    setResult((prev) => prev - number);
  };

  const multiply = () => {
    const number = getNumberFromInput();
    setResult((prev) => prev * number);
  };

  const divide = () => {
    const number = getNumberFromInput();

    if (number === 0) {
      alert("You cannot divide by 0");
      return;
    }

    setResult((prev) => prev / number);
  };

  const resetInput = () => {
    setInputValue("");
  };

  const resetResult = () => {
    setResult(0);
  };

  return (
    <div className="App">
      <h1>Simplest Working Calculator</h1>
      <h2>{result}</h2>

      <input
        type="number"
        placeholder="Enter a number"
        value={inputValue}
        onChange={handleChange}
      />

      <div className="buttons">
        <button onClick={add}>add</button>
        <button onClick={subtract}>subtract</button>
        <button onClick={multiply}>multiply</button>
        <button onClick={divide}>divide</button>
        <button onClick={resetInput}>reset input</button>
        <button onClick={resetResult}>reset result</button>
      </div>
    </div>
  );
}

export default App;
