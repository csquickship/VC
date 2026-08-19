import crypto from 'crypto';
import { Meeting, MeetingParticipant, MeetingStatus, ParticipantRole } from '@prisma/client';
import {
  IMeetingRepository,
  MeetingWithDetails,
} from '../repositories/interfaces/meeting.repository.interface.js';

export interface CreateMeetingDTO {
  title?: string;
  hostUserId: string;
}

export class MeetingService {
  constructor(private readonly meetingRepository: IMeetingRepository) {}

  /**
   * Generates a unique, friendly meeting code (e.g., 'abc-defg-hij').
   */
  private generateMeetingCode(): string {
    const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
    const generateSegment = (len: number) => {
      let segment = '';
      const randomBytes = crypto.randomBytes(len);
      for (let i = 0; i < len; i++) {
        segment += chars[randomBytes[i] % chars.length];
      }
      return segment;
    };

    return `${generateSegment(3)}-${generateSegment(4)}-${generateSegment(3)}`;
  }

  public async createMeeting(dto: CreateMeetingDTO): Promise<Meeting> {
    let meetingCode = this.generateMeetingCode();
    let attempts = 0;

    // Ensure collision resistance
    while (attempts < 5) {
      const existing = await this.meetingRepository.findByCode(meetingCode);
      if (!existing) break;
      meetingCode = this.generateMeetingCode();
      attempts++;
    }

    const meeting = await this.meetingRepository.create({
      title: dto.title?.trim() || 'Quick Video Meeting',
      meetingCode,
      hostUserId: dto.hostUserId,
      status: MeetingStatus.ACTIVE,
    });

    return meeting;
  }

  public async getMeetingByCode(meetingCode: string): Promise<MeetingWithDetails> {
    const meeting = await this.meetingRepository.findByCode(meetingCode);
    if (!meeting) {
      const error = new Error(`Meeting with code "${meetingCode}" not found`);
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }
    return meeting;
  }

  public async joinMeeting(
    meetingCode: string,
    userId: string
  ): Promise<{ meeting: MeetingWithDetails; participant: MeetingParticipant }> {
    const meeting = await this.meetingRepository.findByCode(meetingCode);
    if (!meeting) {
      const error = new Error(`Meeting with code "${meetingCode}" not found`);
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    if (meeting.status === MeetingStatus.ENDED) {
      const error = new Error('This meeting has already ended');
      (error as Error & { statusCode?: number }).statusCode = 400;
      throw error;
    }

    const isHost = meeting.hostUserId === userId;
    const role = isHost ? ParticipantRole.HOST : ParticipantRole.PARTICIPANT;

    const participant = await this.meetingRepository.upsertParticipant({
      meetingId: meeting.id,
      userId,
      role,
    });

    const updatedMeeting = await this.meetingRepository.findByCode(meetingCode);

    return {
      meeting: updatedMeeting || meeting,
      participant,
    };
  }

  public async endMeeting(
    meetingCode: string,
    userId: string
  ): Promise<Meeting> {
    const meeting = await this.meetingRepository.findByCode(meetingCode);
    if (!meeting) {
      const error = new Error(`Meeting with code "${meetingCode}" not found`);
      (error as Error & { statusCode?: number }).statusCode = 404;
      throw error;
    }

    // Authorization: only the host can end the meeting
    if (meeting.hostUserId !== userId) {
      const error = new Error('Only the meeting host is authorized to end this meeting');
      (error as Error & { statusCode?: number }).statusCode = 403;
      throw error;
    }

    if (meeting.status === MeetingStatus.ENDED) {
      return meeting;
    }

    const updatedMeeting = await this.meetingRepository.updateStatus(
      meeting.id,
      MeetingStatus.ENDED,
      new Date()
    );

    return updatedMeeting;
  }

  public async listUserMeetings(userId: string): Promise<MeetingWithDetails[]> {
    return this.meetingRepository.listByUser(userId);
  }

  public async recordParticipantLeft(
    meetingId: string,
    userId: string
  ): Promise<void> {
    await this.meetingRepository.updateParticipantLeft(meetingId, userId, new Date());
  }
}
