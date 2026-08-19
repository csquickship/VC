import { Meeting, MeetingParticipant, MeetingStatus, ParticipantRole } from '@prisma/client';
import { prisma } from './prisma.client.js';
import {
  IMeetingRepository,
  MeetingWithDetails,
} from '../interfaces/meeting.repository.interface.js';

export class MeetingRepository implements IMeetingRepository {
  public async create(data: {
    title: string;
    meetingCode: string;
    hostUserId: string;
    status?: MeetingStatus;
  }): Promise<Meeting> {
    return prisma.meeting.create({
      data: {
        title: data.title,
        meetingCode: data.meetingCode,
        hostUserId: data.hostUserId,
        status: data.status || MeetingStatus.ACTIVE,
        participants: {
          create: {
            userId: data.hostUserId,
            role: ParticipantRole.HOST,
          },
        },
      },
    });
  }

  public async findByCode(meetingCode: string): Promise<MeetingWithDetails | null> {
    return prisma.meeting.findUnique({
      where: { meetingCode },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });
  }

  public async findById(id: string): Promise<MeetingWithDetails | null> {
    return prisma.meeting.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    });
  }

  public async listByUser(userId: string): Promise<MeetingWithDetails[]> {
    return prisma.meeting.findMany({
      where: {
        OR: [
          { hostUserId: userId },
          {
            participants: {
              some: {
                userId,
              },
            },
          },
        ],
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50,
    });
  }

  public async updateStatus(
    id: string,
    status: MeetingStatus,
    endedAt?: Date
  ): Promise<Meeting> {
    return prisma.meeting.update({
      where: { id },
      data: {
        status,
        ...(endedAt ? { endedAt } : {}),
      },
    });
  }

  public async upsertParticipant(data: {
    meetingId: string;
    userId: string;
    role?: ParticipantRole;
  }): Promise<MeetingParticipant> {
    return prisma.meetingParticipant.upsert({
      where: {
        meetingId_userId: {
          meetingId: data.meetingId,
          userId: data.userId,
        },
      },
      create: {
        meetingId: data.meetingId,
        userId: data.userId,
        role: data.role || ParticipantRole.PARTICIPANT,
        joinedAt: new Date(),
        leftAt: null,
      },
      update: {
        leftAt: null, // Reset leftAt upon re-joining
      },
    });
  }

  public async updateParticipantLeft(
    meetingId: string,
    userId: string,
    leftAt: Date = new Date()
  ): Promise<MeetingParticipant | null> {
    try {
      return await prisma.meetingParticipant.update({
        where: {
          meetingId_userId: {
            meetingId,
            userId,
          },
        },
        data: {
          leftAt,
        },
      });
    } catch {
      return null;
    }
  }
}
