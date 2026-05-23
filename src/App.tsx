import { useState } from "react";
import TitlePage from "./TitlePage.js";
import MainUI from "./MainUI.js";

export default function App() {
  const [started, setStarted] = useState(false);

  return (
    <>
      {!started ? <TitlePage onStart={() => setStarted(true)} /> : <MainUI />}
    </>
  );
}
