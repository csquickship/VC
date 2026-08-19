import { describe, it, expect, beforeEach } from 'vitest';
import { MeetingService } from '../src/services/meeting.service.js';
import {
  IMeetingRepository,
  MeetingWithDetails,
} from '../src/repositories/interfaces/meeting.repository.interface.js';
import { Meeting, MeetingParticipant, MeetingStatus, ParticipantRole } from '@prisma/client';

class MockMeetingRepository implements IMeetingRepository {
  private meetings: Map<string, MeetingWithDetails> = new Map();

  public async create(data: {
    title: string;
    meetingCode: string;
    hostUserId: string;
    status?: MeetingStatus;
  }): Promise<Meeting> {
    const meeting: MeetingWithDetails = {
      id: `meeting-${Date.now()}`,
      title: data.title,
      meetingCode: data.meetingCode,
      hostUserId: data.hostUserId,
      status: data.status || MeetingStatus.ACTIVE,
      createdAt: new Date(),
      startedAt: new Date(),
      endedAt: null,
      host: { id: data.hostUserId, name: 'Host', email: 'host@example.com' },
      participants: [
        {
          id: `part-${Date.now()}`,
          meetingId: `meeting-${Date.now()}`,
          userId: data.hostUserId,
          role: ParticipantRole.HOST,
          joinedAt: new Date(),
          leftAt: null,
          user: { id: data.hostUserId, name: 'Host', email: 'host@example.com' },
        },
      ],
    };
    this.meetings.set(meeting.meetingCode, meeting);
    return meeting;
  }

  public async findByCode(meetingCode: string): Promise<MeetingWithDetails | null> {
    return this.meetings.get(meetingCode) || null;
  }

  public async findById(id: string): Promise<MeetingWithDetails | null> {
    for (const m of this.meetings.values()) {
      if (m.id === id) return m;
    }
    return null;
  }

  public async listByUser(userId: string): Promise<MeetingWithDetails[]> {
    return Array.from(this.meetings.values()).filter(
      (m) => m.hostUserId === userId || m.participants.some((p) => p.userId === userId)
    );
  }

  public async updateStatus(
    id: string,
    status: MeetingStatus,
    endedAt?: Date
  ): Promise<Meeting> {
    for (const m of this.meetings.values()) {
      if (m.id === id) {
        m.status = status;
        if (endedAt) m.endedAt = endedAt;
        return m;
      }
    }
    throw new Error('Not found');
  }

  public async upsertParticipant(data: {
    meetingId: string;
    userId: string;
    role?: ParticipantRole;
  }): Promise<MeetingParticipant> {
    const part: MeetingParticipant = {
      id: `part-${Date.now()}`,
      meetingId: data.meetingId,
      userId: data.userId,
      role: data.role || ParticipantRole.PARTICIPANT,
      joinedAt: new Date(),
      leftAt: null,
    };
    return part;
  }

  public async updateParticipantLeft(
    _meetingId: string,
    _userId: string,
    _leftAt?: Date
  ): Promise<MeetingParticipant | null> {
    return null;
  }
}

describe('MeetingService', () => {
  let meetingRepo: MockMeetingRepository;
  let meetingService: MeetingService;

  beforeEach(() => {
    meetingRepo = new MockMeetingRepository();
    meetingService = new MeetingService(meetingRepo);
  });

  it('should create a meeting with a generated code and active status', async () => {
    const meeting = await meetingService.createMeeting({
      title: 'Standup',
      hostUserId: 'user-1',
    });

    expect(meeting.meetingCode).toMatch(/^[a-z0-9]{3}-[a-z0-9]{4}-[a-z0-9]{3}$/);
    expect(meeting.title).toBe('Standup');
    expect(meeting.hostUserId).toBe('user-1');
    expect(meeting.status).toBe(MeetingStatus.ACTIVE);
  });

  it('should allow joining an active meeting', async () => {
    const created = await meetingService.createMeeting({
      title: 'Design Review',
      hostUserId: 'host-1',
    });

    const result = await meetingService.joinMeeting(created.meetingCode, 'guest-2');
    expect(result.participant.userId).toBe('guest-2');
    expect(result.participant.role).toBe(ParticipantRole.PARTICIPANT);
  });

  it('should only allow the host to end the meeting', async () => {
    const created = await meetingService.createMeeting({
      title: 'Sprint Planning',
      hostUserId: 'host-1',
    });

    // Guest tries to end -> Rejected with 403
    await expect(
      meetingService.endMeeting(created.meetingCode, 'guest-99')
    ).rejects.toThrow('Only the meeting host is authorized to end this meeting');

    // Host ends -> Success
    const ended = await meetingService.endMeeting(created.meetingCode, 'host-1');
    expect(ended.status).toBe(MeetingStatus.ENDED);
  });

  it('should reject joining an ended meeting', async () => {
    const created = await meetingService.createMeeting({
      title: 'Retrospective',
      hostUserId: 'host-1',
    });

    await meetingService.endMeeting(created.meetingCode, 'host-1');

    await expect(
      meetingService.joinMeeting(created.meetingCode, 'guest-2')
    ).rejects.toThrow('This meeting has already ended');
  });
});
