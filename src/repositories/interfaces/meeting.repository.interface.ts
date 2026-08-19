import { Meeting, MeetingParticipant, MeetingStatus, ParticipantRole, Prisma } from '@prisma/client';

export type MeetingWithDetails = Meeting & {
  host: { id: string; name: string; email: string };
  participants: (MeetingParticipant & {
    user: { id: string; name: string; email: string };
  })[];
};

export interface IMeetingRepository {
  create(data: {
    title: string;
    meetingCode: string;
    hostUserId: string;
    status?: MeetingStatus;
  }): Promise<Meeting>;

  findByCode(meetingCode: string): Promise<MeetingWithDetails | null>;
  findById(id: string): Promise<MeetingWithDetails | null>;
  listByUser(userId: string): Promise<MeetingWithDetails[]>;
  updateStatus(id: string, status: MeetingStatus, endedAt?: Date): Promise<Meeting>;

  upsertParticipant(data: {
    meetingId: string;
    userId: string;
    role?: ParticipantRole;
  }): Promise<MeetingParticipant>;

  updateParticipantLeft(meetingId: string, userId: string, leftAt?: Date): Promise<MeetingParticipant | null>;
}
