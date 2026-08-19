import { describe, it, expect, beforeEach } from 'vitest';
import { RoomManager } from '../src/websocket/roomManager.js';

describe('RoomManager', () => {
  let roomManager: RoomManager;

  beforeEach(() => {
    roomManager = new RoomManager();
  });

  it('should allow two participants to join a room', () => {
    const roomId = 'room-101';

    const res1 = roomManager.addSocket(roomId, 'socket-1');
    expect(res1).toBe('joined');
    expect(roomManager.getCount(roomId)).toBe(1);

    const res2 = roomManager.addSocket(roomId, 'socket-2');
    expect(res2).toBe('joined');
    expect(roomManager.getCount(roomId)).toBe(2);
  });

  it('should prevent duplicate socket joins in the same room', () => {
    const roomId = 'room-101';
    roomManager.addSocket(roomId, 'socket-1');
    const res = roomManager.addSocket(roomId, 'socket-1');
    expect(res).toBe('already-joined');
    expect(roomManager.getCount(roomId)).toBe(1);
  });

  it('should reject a 3rd socket when room capacity is 2', () => {
    const roomId = 'room-101';
    roomManager.addSocket(roomId, 'socket-1');
    roomManager.addSocket(roomId, 'socket-2');

    const res3 = roomManager.addSocket(roomId, 'socket-3');
    expect(res3).toBe('room-full');
    expect(roomManager.getCount(roomId)).toBe(2);
  });

  it('should clean up when sockets leave or disconnect', () => {
    const roomId = 'room-101';
    roomManager.addSocket(roomId, 'socket-1');
    roomManager.addSocket(roomId, 'socket-2');

    roomManager.removeSocket(roomId, 'socket-1');
    expect(roomManager.getCount(roomId)).toBe(1);

    const affected = roomManager.removeSocketFromAll('socket-2');
    expect(affected).toContain(roomId);
    expect(roomManager.getCount(roomId)).toBe(0);
  });
});
