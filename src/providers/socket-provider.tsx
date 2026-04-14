'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { KitchenTicket } from '@/lib/types';

interface SocketContextValue {
  socket: Socket | null;
  isConnected: boolean;
  joinBranch: (branchId: string) => void;
  bumpTicket: (ticketId: string, status: string) => void;
  onNewTicket: (cb: (ticket: KitchenTicket) => void) => () => void;
  onTicketUpdated: (cb: (ticket: KitchenTicket) => void) => () => void;
}

const SocketContext = createContext<SocketContextValue>({
  socket: null,
  isConnected: false,
  joinBranch: () => {},
  bumpTicket: () => {},
  onNewTicket: () => () => {},
  onTicketUpdated: () => () => {},
});

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const socket = io(`${wsUrl}/kds`, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    return () => {
      socket.disconnect();
    };
  }, []);

  const joinBranch = (branchId: string) => {
    socketRef.current?.emit('joinBranch', { branchId });
  };

  const bumpTicket = (ticketId: string, status: string) => {
    socketRef.current?.emit('bumpTicket', { ticketId, status });
  };

  const onNewTicket = (cb: (ticket: KitchenTicket) => void) => {
    socketRef.current?.on('newTicket', cb);
    return () => {
      socketRef.current?.off('newTicket', cb);
    };
  };

  const onTicketUpdated = (cb: (ticket: KitchenTicket) => void) => {
    socketRef.current?.on('ticketUpdated', cb);
    return () => {
      socketRef.current?.off('ticketUpdated', cb);
    };
  };

  return (
    <SocketContext.Provider
      value={{
        socket: socketRef.current,
        isConnected,
        joinBranch,
        bumpTicket,
        onNewTicket,
        onTicketUpdated,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}
