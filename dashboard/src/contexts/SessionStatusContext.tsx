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
import type { SessionStatus } from "../types";
import { getAllSessionStatuses, type SessionStatusInfo } from "../services/api";

// Polling interval in milliseconds
const POLL_INTERVAL_MS = 5000;

interface SessionStatusContextValue {
  // Get status for a specific session
  getSessionStatus: (sessionId: string) => SessionStatusInfo | undefined;
  // Get all statuses
  allStatuses: Record<string, SessionStatusInfo>;
  // Check if a session is running (convenience method)
  isSessionRunning: (sessionId: string) => boolean;
  // Get the effective status (considers running state)
  getEffectiveStatus: (sessionId: string) => SessionStatus;
  // Force refresh statuses
  refresh: () => Promise<void>;
  // Last update timestamp
  lastUpdated: number;
  // Loading state
  isLoading: boolean;
}

const SessionStatusContext = createContext<SessionStatusContextValue | null>(
  null,
);

interface SessionStatusProviderProps {
  children: ReactNode;
}

export function SessionStatusProvider({
  children,
}: SessionStatusProviderProps) {
  const [statuses, setStatuses] = useState<Record<string, SessionStatusInfo>>(
    {},
  );
  const [lastUpdated, setLastUpdated] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchStatuses = useCallback(async () => {
    try {
      const response = await getAllSessionStatuses();
      if (isMounted.current) {
        setStatuses(response.data);
        setLastUpdated(Date.now());
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Failed to fetch session statuses:", err);
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Initial fetch and polling setup
  useEffect(() => {
    isMounted.current = true;

    const poll = async () => {
      await fetchStatuses();
      if (isMounted.current) {
        pollTimeoutRef.current = setTimeout(poll, POLL_INTERVAL_MS);
      }
    };

    // Start polling
    poll();

    return () => {
      isMounted.current = false;
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
      }
    };
  }, [fetchStatuses]);

  const getSessionStatus = useCallback(
    (sessionId: string): SessionStatusInfo | undefined => {
      return statuses[sessionId];
    },
    [statuses],
  );

  const isSessionRunning = useCallback(
    (sessionId: string): boolean => {
      return statuses[sessionId]?.running ?? false;
    },
    [statuses],
  );

  const getEffectiveStatus = useCallback(
    (sessionId: string): SessionStatus => {
      const status = statuses[sessionId];
      if (!status) return "idle";
      if (status.running) return "working";
      return status.status;
    },
    [statuses],
  );

  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStatuses();
  }, [fetchStatuses]);

  const value: SessionStatusContextValue = {
    getSessionStatus,
    allStatuses: statuses,
    isSessionRunning,
    getEffectiveStatus,
    refresh,
    lastUpdated,
    isLoading,
  };

  return (
    <SessionStatusContext.Provider value={value}>
      {children}
    </SessionStatusContext.Provider>
  );
}

// Hook to use session status context
export function useSessionStatuses(): SessionStatusContextValue {
  const context = useContext(SessionStatusContext);
  if (!context) {
    throw new Error(
      "useSessionStatuses must be used within a SessionStatusProvider",
    );
  }
  return context;
}

// Convenience hook for a single session's status
export function useSessionStatus(sessionId: string): {
  status: SessionStatus;
  isRunning: boolean;
  statusInfo: SessionStatusInfo | undefined;
} {
  const { allStatuses } = useSessionStatuses();

  // Memoize the result to prevent unnecessary re-renders
  const statusInfo = allStatuses[sessionId];
  const isRunning = statusInfo?.running ?? false;
  const status: SessionStatus = !statusInfo
    ? "idle"
    : isRunning
      ? "working"
      : statusInfo.status;

  // Use useMemo to return stable object reference when values haven't changed
  return useMemo(
    () => ({
      status,
      isRunning,
      statusInfo,
    }),
    [status, isRunning, statusInfo],
  );
}
