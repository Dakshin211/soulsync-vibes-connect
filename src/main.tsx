import { createRoot } from "react-dom/client";
import { useState, useEffect } from "react";
import App from "./App.tsx";
import SplashScreen from "./components/SplashScreen";
import "./index.css";

function Root() {
  const [showSplash, setShowSplash] = useState(true);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return <App />;
}

createRoot(document.getElementById("root")!).render(<Root />);
