import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { config } from '../config/index.js';
import { log } from '../utils/logger.js';
import { RoomManager } from './roomManager.js';
import {
  isValidJoinPayload,
  isValidOfferPayload,
  isValidAnswerPayload,
  isValidIceCandidatePayload,
  isValidRoomId,
} from '../validators/signaling.validator.js';

export interface SignalingServerInstance {
  io: Server;
  roomManager: RoomManager;
  notifyMeetingEnded: (roomId: string) => void;
}

export function createSignalingServer(httpServer: HttpServer): SignalingServerInstance {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  const roomManager = new RoomManager();

  io.on('connection', (socket: Socket) => {
    log('INFO', 'SIGNALING', `Client connected: ${socket.id}`);

    // 1. Join Room Event
    socket.on('join-room', (data: unknown) => {
      if (!isValidJoinPayload(data)) {
        log('WARN', 'SIGNALING', `Invalid join-room payload from socket ${socket.id}`, { data });
        socket.emit('error', { message: 'Invalid room ID format' });
        return;
      }

      const { roomId } = data;
      const joinResult = roomManager.addSocket(roomId, socket.id);

      if (joinResult === 'room-full') {
        log('WARN', 'SIGNALING', `Socket ${socket.id} rejected from full room "${roomId}"`);
        socket.emit('room-full', {
          roomId,
          message: 'Room is full. Maximum 2 participants allowed.',
        });
        return;
      }

      // Join socket to Socket.IO room channel
      socket.join(roomId);
      const participantCount = roomManager.getCount(roomId);

      // Notify existing peer if present
      if (participantCount === 2) {
        socket.to(roomId).emit('user-joined', {
          peerId: socket.id,
          roomId,
        });
        log('INFO', 'SIGNALING', `Notified existing participant in room "${roomId}" of peer ${socket.id}`);
      }

      log('INFO', 'SIGNALING', `Socket ${socket.id} joined room "${roomId}" (${participantCount}/2)`);

      // Confirm to joining client
      socket.emit('room-joined', {
        roomId,
        participantCount,
        socketId: socket.id,
      });
    });

    // 2. Offer Event
    socket.on('offer', (data: unknown) => {
      if (!isValidOfferPayload(data)) {
        log('WARN', 'SIGNALING', `Invalid offer payload from socket ${socket.id}`, { data });
        socket.emit('error', { message: 'Invalid offer payload' });
        return;
      }

      const { roomId, offer } = data;

      if (!socket.rooms.has(roomId)) {
        log('WARN', 'SIGNALING', `Socket ${socket.id} attempted to send offer to non-joined room "${roomId}"`);
        socket.emit('error', { message: 'You must join the room before sending an offer' });
        return;
      }

      log('INFO', 'SIGNALING', `Relaying offer from socket ${socket.id} in room "${roomId}"`);
      socket.to(roomId).emit('offer', {
        offer,
        senderId: socket.id,
        roomId,
      });
    });

    // 3. Answer Event
    socket.on('answer', (data: unknown) => {
      if (!isValidAnswerPayload(data)) {
        log('WARN', 'SIGNALING', `Invalid answer payload from socket ${socket.id}`, { data });
        socket.emit('error', { message: 'Invalid answer payload' });
        return;
      }

      const { roomId, answer } = data;

      if (!socket.rooms.has(roomId)) {
        log('WARN', 'SIGNALING', `Socket ${socket.id} attempted to send answer to non-joined room "${roomId}"`);
        socket.emit('error', { message: 'You must join the room before sending an answer' });
        return;
      }

      log('INFO', 'SIGNALING', `Relaying answer from socket ${socket.id} in room "${roomId}"`);
      socket.to(roomId).emit('answer', {
        answer,
        senderId: socket.id,
        roomId,
      });
    });

    // 4. ICE Candidate Event
    socket.on('ice-candidate', (data: unknown) => {
      if (!isValidIceCandidatePayload(data)) {
        log('WARN', 'SIGNALING', `Invalid ICE candidate payload from socket ${socket.id}`, { data });
        socket.emit('error', { message: 'Invalid ICE candidate payload' });
        return;
      }

      const { roomId, candidate } = data;

      if (!socket.rooms.has(roomId)) {
        log('WARN', 'SIGNALING', `Socket ${socket.id} attempted to send ICE candidate to non-joined room "${roomId}"`);
        socket.emit('error', { message: 'You must join the room before sending ICE candidates' });
        return;
      }

      log('DEBUG', 'SIGNALING', `Relaying ICE candidate from socket ${socket.id} in room "${roomId}"`);
      socket.to(roomId).emit('ice-candidate', {
        candidate,
        senderId: socket.id,
        roomId,
      });
    });

    // 5. Leave Room Event
    socket.on('leave-room', (data: unknown) => {
      let roomId: string | undefined;
      if (typeof data === 'object' && data !== null && 'roomId' in data) {
        roomId = (data as { roomId: string }).roomId;
      }

      if (!isValidRoomId(roomId)) {
        log('WARN', 'SIGNALING', `Invalid leave-room payload from socket ${socket.id}`);
        socket.emit('error', { message: 'Invalid room ID' });
        return;
      }

      if (socket.rooms.has(roomId)) {
        roomManager.removeSocket(roomId, socket.id);
        socket.to(roomId).emit('user-left', {
          peerId: socket.id,
          roomId,
        });
        socket.leave(roomId);
        log('INFO', 'SIGNALING', `Socket ${socket.id} left room "${roomId}"`);
      }
    });

    // 6. Handle Disconnecting & Automatic Cleanup
    socket.on('disconnecting', () => {
      const affectedRooms = roomManager.removeSocketFromAll(socket.id);
      for (const roomId of affectedRooms) {
        socket.to(roomId).emit('user-left', {
          peerId: socket.id,
          roomId,
        });
        log('INFO', 'SIGNALING', `Socket ${socket.id} cleaned up from room "${roomId}" on disconnect`);
      }
    });

    socket.on('disconnect', (reason: string) => {
      log('INFO', 'SIGNALING', `Client disconnected: ${socket.id}`, { reason });
    });
  });

  const notifyMeetingEnded = (roomId: string): void => {
    io.to(roomId).emit('meeting-ended', {
      roomId,
      message: 'The host has ended this meeting.',
    });
    log('INFO', 'SIGNALING', `Emitted meeting-ended event to room "${roomId}"`);
  };

  return {
    io,
    roomManager,
    notifyMeetingEnded,
  };
}
