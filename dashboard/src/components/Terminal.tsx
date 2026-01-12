import { useEffect, useRef, useState } from "react";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { getTerminalWsUrl } from "../services/api";

interface TerminalProps {
  sessionId: string;
  projectPath: string;
  mode?: "new" | "resume";
  onClose?: () => void;
}

export function Terminal({
  sessionId,
  projectPath,
  mode = "resume",
  onClose,
}: TerminalProps) {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<
    "connecting" | "connected" | "disconnected" | "error"
  >("connecting");
  const [isReconnect, setIsReconnect] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const xterm = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: '"JetBrains Mono", "Fira Code", monospace',
      theme: {
        background: "#1a1a2e",
        foreground: "#eee",
        cursor: "#f8f8f2",
        cursorAccent: "#1a1a2e",
        selectionBackground: "#44475a",
        black: "#21222c",
        red: "#ff5555",
        green: "#50fa7b",
        yellow: "#f1fa8c",
        blue: "#bd93f9",
        magenta: "#ff79c6",
        cyan: "#8be9fd",
        white: "#f8f8f2",
        brightBlack: "#6272a4",
        brightRed: "#ff6e6e",
        brightGreen: "#69ff94",
        brightYellow: "#ffffa5",
        brightBlue: "#d6acff",
        brightMagenta: "#ff92df",
        brightCyan: "#a4ffff",
        brightWhite: "#ffffff",
      },
    });

    const fitAddon = new FitAddon();
    xterm.loadAddon(fitAddon);
    xterm.open(terminalRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    fitAddonRef.current = fitAddon;

    xterm.writeln(
      mode === "new"
        ? "\x1b[33mStarting new Claude session...\x1b[0m"
        : "\x1b[33mConnecting to session...\x1b[0m",
    );

    // Connect WebSocket
    const wsUrl = getTerminalWsUrl(sessionId, projectPath, mode);
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      // Send initial resize
      ws.send(
        JSON.stringify({
          type: "resize",
          cols: xterm.cols,
          rows: xterm.rows,
        }),
      );
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") {
          // Check if this is a reconnection message
          if (msg.data.includes("[Reconnected to existing session]")) {
            setIsReconnect(true);
          }
          xterm.write(msg.data);
        } else if (msg.type === "exit") {
          xterm.writeln(
            `\r\n\x1b[31mSession exited with code ${msg.code}\x1b[0m`,
          );
          setStatus("disconnected");
        } else if (msg.type === "error") {
          xterm.writeln(`\r\n\x1b[31mError: ${msg.message}\x1b[0m`);
          setStatus("error");
        }
      } catch {
        // Raw output fallback
        xterm.write(event.data);
      }
    };

    ws.onerror = () => {
      setStatus("error");
      xterm.writeln("\r\n\x1b[31mConnection error\x1b[0m");
    };

    ws.onclose = () => {
      if (status !== "error") {
        setStatus("disconnected");
        xterm.writeln("\r\n\x1b[33mDisconnected\x1b[0m");
      }
    };

    // Handle terminal input
    xterm.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "input", data }));
      }
    });

    // Handle resize
    const handleResize = () => {
      fitAddon.fit();
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "resize",
            cols: xterm.cols,
            rows: xterm.rows,
          }),
        );
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      xterm.dispose();
    };
  }, [sessionId, projectPath, mode]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a2e] rounded-lg overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : status === "error"
                    ? "bg-red-500"
                    : "bg-gray-500"
            }`}
          />
          <span className="text-sm text-gray-300">
            {status === "connected" && "Connected"}
            {status === "connecting" && "Connecting..."}
            {status === "disconnected" && "Disconnected"}
            {status === "error" && "Connection Error"}
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Terminal container */}
      <div
        ref={terminalRef}
        className="flex-1 p-2"
        style={{ minHeight: "400px" }}
      />
    </div>
  );
}
