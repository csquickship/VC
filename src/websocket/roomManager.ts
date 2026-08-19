/**
 * In-memory runtime state manager for active Socket.IO meeting rooms.
 * Transient state only - not stored in PostgreSQL.
 */
export class RoomManager {
  // Map of roomId (meetingCode) -> Set of active socket IDs
  private rooms: Map<string, Set<string>> = new Map();
  // Map of socketId -> Set of roomIds
  private socketRooms: Map<string, Set<string>> = new Map();
  private maxParticipants: number = 2;

  /**
   * Adds a socket to a room if capacity permits.
   * Returns:
   *   'joined' if added
   *   'already-joined' if already in room
   *   'room-full' if room has maxParticipants
   */
  public addSocket(
    roomId: string,
    socketId: string
  ): 'joined' | 'already-joined' | 'room-full' {
    let roomSockets = this.rooms.get(roomId);
    if (!roomSockets) {
      roomSockets = new Set<string>();
      this.rooms.set(roomId, roomSockets);
    }

    if (roomSockets.has(socketId)) {
      return 'already-joined';
    }

    if (roomSockets.size >= this.maxParticipants) {
      return 'room-full';
    }

    roomSockets.add(socketId);

    let userRooms = this.socketRooms.get(socketId);
    if (!userRooms) {
      userRooms = new Set<string>();
      this.socketRooms.set(socketId, userRooms);
    }
    userRooms.add(roomId);

    return 'joined';
  }

  /**
   * Removes a socket from a specific room.
   */
  public removeSocket(roomId: string, socketId: string): void {
    const roomSockets = this.rooms.get(roomId);
    if (roomSockets) {
      roomSockets.delete(socketId);
      if (roomSockets.size === 0) {
        this.rooms.delete(roomId);
      }
    }

    const userRooms = this.socketRooms.get(socketId);
    if (userRooms) {
      userRooms.delete(roomId);
      if (userRooms.size === 0) {
        this.socketRooms.delete(socketId);
      }
    }
  }

  /**
   * Removes a socket from all rooms it is currently in (e.g. on disconnect).
   * Returns list of roomIds the socket was removed from.
   */
  public removeSocketFromAll(socketId: string): string[] {
    const userRooms = this.socketRooms.get(socketId);
    if (!userRooms) return [];

    const affectedRooms: string[] = Array.from(userRooms);
    for (const roomId of affectedRooms) {
      const roomSockets = this.rooms.get(roomId);
      if (roomSockets) {
        roomSockets.delete(socketId);
        if (roomSockets.size === 0) {
          this.rooms.delete(roomId);
        }
      }
    }

    this.socketRooms.delete(socketId);
    return affectedRooms;
  }

  /**
   * Gets the participant count in a room.
   */
  public getCount(roomId: string): number {
    return this.rooms.get(roomId)?.size || 0;
  }

  /**
   * Gets all active socket IDs in a room.
   */
  public getSocketsInRoom(roomId: string): string[] {
    const roomSockets = this.rooms.get(roomId);
    return roomSockets ? Array.from(roomSockets) : [];
  }
}
