import { io } from 'socket.io-client';

const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '');

export const socket = apiUrl ? io(apiUrl, { autoConnect: false }) : null;
