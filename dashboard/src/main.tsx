import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { SessionStatusProvider } from "./contexts/SessionStatusContext";
import { SlashCommandsProvider } from "./contexts/SlashCommandsContext";
import { SessionStreamProvider } from "./contexts/SessionStreamContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionStatusProvider>
      <SlashCommandsProvider>
        <SessionStreamProvider>
          <App />
        </SessionStreamProvider>
      </SlashCommandsProvider>
    </SessionStatusProvider>
  </StrictMode>,
);
