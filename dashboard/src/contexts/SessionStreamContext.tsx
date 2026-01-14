import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { ParsedMessage, TodoItem } from "../types";

const BASE_URL = "/api";

// Message types from the SSE stream
interface StreamMessage {
  type: string;
  sessionId?: string;
  message?: ParsedMessage;
  status?: string;
  todos?: TodoItem[];
  data?: unknown;
}

type MessageHandler = (data: StreamMessage) => void;

interface SessionStreamContextValue {
  // Subscribe to updates for a specific session
  subscribe: (sessionId: string, handler: MessageHandler) => () => void;
  // Check if connected
  isConnected: boolean;
}

const SessionStreamContext = createContext<SessionStreamContextValue | null>(
  null,
);

interface SessionStreamProviderProps {
  children: ReactNode;
}

export function SessionStreamProvider({
  children,
}: SessionStreamProviderProps) {
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const subscribersRef = useRef<Map<string, Set<MessageHandler>>>(new Map());
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  // Connect to the unified stream endpoint
  const connect = useCallback(() => {
    if (eventSourceRef.current) {
      return; // Already connected
    }

    const eventSource = new EventSource(`${BASE_URL}/stream/sessions`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      // Clear any pending reconnect
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };

    eventSource.onmessage = (event) => {
      try {
        const data: StreamMessage = JSON.parse(event.data);

        // Route message to appropriate subscribers
        if (data.sessionId) {
          const handlers = subscribersRef.current.get(data.sessionId);
          if (handlers && handlers.size > 0) {
            handlers.forEach((handler) => handler(data));
          }
        }

        // Also send to wildcard subscribers (for global updates)
        const wildcardHandlers = subscribersRef.current.get("*");
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(data));
        }
      } catch (err) {
        console.error("[SessionStream] Parse error:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("[SessionStream] Connection error:", err);
      setIsConnected(false);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;

      // Reconnect after delay
      if (!reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connect();
        }, 3000);
      }
    };
  }, []);

  // Disconnect when no subscribers
  const maybeDisconnect = useCallback(() => {
    // Check if any subscribers remain
    let hasSubscribers = false;
    subscribersRef.current.forEach((handlers) => {
      if (handlers.size > 0) {
        hasSubscribers = true;
      }
    });

    if (!hasSubscribers && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  // Subscribe to a session's updates
  const subscribe = useCallback(
    (sessionId: string, handler: MessageHandler): (() => void) => {
      // Add handler to subscribers map
      if (!subscribersRef.current.has(sessionId)) {
        subscribersRef.current.set(sessionId, new Set());
      }
      subscribersRef.current.get(sessionId)!.add(handler);

      // Connect if not already connected
      connect();

      // Return unsubscribe function
      return () => {
        const handlers = subscribersRef.current.get(sessionId);
        if (handlers) {
          handlers.delete(handler);
          if (handlers.size === 0) {
            subscribersRef.current.delete(sessionId);
          }
        }
        // Disconnect if no more subscribers
        maybeDisconnect();
      };
    },
    [connect, maybeDisconnect],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<SessionStreamContextValue>(
    () => ({
      subscribe,
      isConnected,
    }),
    [subscribe, isConnected],
  );

  return (
    <SessionStreamContext.Provider value={value}>
      {children}
    </SessionStreamContext.Provider>
  );
}

// Hook to use the session stream
export function useSessionStream(): SessionStreamContextValue {
  const context = useContext(SessionStreamContext);
  if (!context) {
    throw new Error(
      "useSessionStream must be used within a SessionStreamProvider",
    );
  }
  return context;
}

// Convenience hook for subscribing to a specific session
export function useSessionMessages(
  sessionId: string,
  onMessage: (message: ParsedMessage) => void,
  onConnected?: () => void,
): { isConnected: boolean } {
  const { subscribe, isConnected } = useSessionStream();
  const onMessageRef = useRef(onMessage);
  const onConnectedRef = useRef(onConnected);

  // Keep refs updated
  useEffect(() => {
    onMessageRef.current = onMessage;
    onConnectedRef.current = onConnected;
  }, [onMessage, onConnected]);

  useEffect(() => {
    const unsubscribe = subscribe(sessionId, (data) => {
      if (data.type === "connected") {
        onConnectedRef.current?.();
      } else if (data.type === "message" && data.message) {
        onMessageRef.current(data.message);
      }
    });

    return unsubscribe;
  }, [sessionId, subscribe]);

  return { isConnected };
}
