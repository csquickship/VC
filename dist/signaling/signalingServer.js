"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSignalingServer = createSignalingServer;
const socket_io_1 = require("socket.io");
const config_js_1 = require("../config.js");
const signalingValidation_js_1 = require("../validation/signalingValidation.js");
function log(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level}] [SIGNALING] ${message}${metaStr}`);
}
function createSignalingServer(httpServer) {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_js_1.config.frontendOrigin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
    });
    io.on('connection', (socket) => {
        log('INFO', `Client connected: ${socket.id}`);
        // 1. Join Room Event
        socket.on('join-room', (data) => {
            if (!(0, signalingValidation_js_1.isValidJoinPayload)(data)) {
                log('WARN', `Invalid join-room payload from socket ${socket.id}`, { data });
                socket.emit('error', { message: 'Invalid room ID format' });
                return;
            }
            const { roomId } = data;
            const room = io.sockets.adapter.rooms.get(roomId);
            const participantCount = room ? room.size : 0;
            // Reject room if it already has 2 participants
            if (participantCount >= 2) {
                log('WARN', `Socket ${socket.id} rejected from full room "${roomId}"`, { participantCount });
                socket.emit('room-full', {
                    roomId,
                    message: 'Room is full. Maximum 2 participants allowed.',
                });
                return;
            }
            // Notify existing participant if present
            if (participantCount === 1) {
                socket.to(roomId).emit('user-joined', {
                    peerId: socket.id,
                    roomId,
                });
                log('INFO', `Notified existing participant in room "${roomId}" of new peer ${socket.id}`);
            }
            // Join socket to room
            socket.join(roomId);
            const updatedCount = participantCount + 1;
            log('INFO', `Socket ${socket.id} joined room "${roomId}" (${updatedCount}/2)`);
            // Send confirmation to joining participant
            socket.emit('room-joined', {
                roomId,
                participantCount: updatedCount,
                socketId: socket.id,
            });
        });
        // 2. Offer Event
        socket.on('offer', (data) => {
            if (!(0, signalingValidation_js_1.isValidOfferPayload)(data)) {
                log('WARN', `Invalid offer payload from socket ${socket.id}`, { data });
                socket.emit('error', { message: 'Invalid offer payload' });
                return;
            }
            const { roomId, offer } = data;
            if (!socket.rooms.has(roomId)) {
                log('WARN', `Socket ${socket.id} attempted to send offer to non-joined room "${roomId}"`);
                socket.emit('error', { message: 'You must join the room before sending an offer' });
                return;
            }
            log('INFO', `Relaying offer from socket ${socket.id} in room "${roomId}"`);
            socket.to(roomId).emit('offer', {
                offer,
                senderId: socket.id,
                roomId,
            });
        });
        // 3. Answer Event
        socket.on('answer', (data) => {
            if (!(0, signalingValidation_js_1.isValidAnswerPayload)(data)) {
                log('WARN', `Invalid answer payload from socket ${socket.id}`, { data });
                socket.emit('error', { message: 'Invalid answer payload' });
                return;
            }
            const { roomId, answer } = data;
            if (!socket.rooms.has(roomId)) {
                log('WARN', `Socket ${socket.id} attempted to send answer to non-joined room "${roomId}"`);
                socket.emit('error', { message: 'You must join the room before sending an answer' });
                return;
            }
            log('INFO', `Relaying answer from socket ${socket.id} in room "${roomId}"`);
            socket.to(roomId).emit('answer', {
                answer,
                senderId: socket.id,
                roomId,
            });
        });
        // 4. ICE Candidate Event
        socket.on('ice-candidate', (data) => {
            if (!(0, signalingValidation_js_1.isValidIceCandidatePayload)(data)) {
                log('WARN', `Invalid ICE candidate payload from socket ${socket.id}`, { data });
                socket.emit('error', { message: 'Invalid ICE candidate payload' });
                return;
            }
            const { roomId, candidate } = data;
            if (!socket.rooms.has(roomId)) {
                log('WARN', `Socket ${socket.id} attempted to send ICE candidate to non-joined room "${roomId}"`);
                socket.emit('error', { message: 'You must join the room before sending ICE candidates' });
                return;
            }
            log('DEBUG', `Relaying ICE candidate from socket ${socket.id} in room "${roomId}"`);
            socket.to(roomId).emit('ice-candidate', {
                candidate,
                senderId: socket.id,
                roomId,
            });
        });
        // 5. Leave Room Event
        socket.on('leave-room', (data) => {
            let roomId;
            if (typeof data === 'object' && data !== null && 'roomId' in data) {
                roomId = data.roomId;
            }
            if (!(0, signalingValidation_js_1.isValidRoomId)(roomId)) {
                log('WARN', `Invalid leave-room payload from socket ${socket.id}`);
                socket.emit('error', { message: 'Invalid room ID' });
                return;
            }
            if (socket.rooms.has(roomId)) {
                socket.to(roomId).emit('user-left', {
                    peerId: socket.id,
                    roomId,
                });
                socket.leave(roomId);
                log('INFO', `Socket ${socket.id} left room "${roomId}"`);
            }
        });
        // 6. Handle Automatic Cleanup on Disconnect
        socket.on('disconnecting', () => {
            for (const roomId of socket.rooms) {
                if (roomId !== socket.id) {
                    socket.to(roomId).emit('user-left', {
                        peerId: socket.id,
                        roomId,
                    });
                    log('INFO', `Socket ${socket.id} disconnecting from room "${roomId}"`);
                }
            }
        });
        socket.on('disconnect', (reason) => {
            log('INFO', `Client disconnected: ${socket.id}`, { reason });
        });
    });
    return io;
}
