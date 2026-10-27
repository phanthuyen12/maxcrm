import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

const API_ORIGIN = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function getSocket(): Socket {
  if (!socket) {
    socket = io(`${API_ORIGIN}/ws`, {
      withCredentials: true,
      autoConnect: true,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
