import { Request, Response, NextFunction } from 'express';
import { MeetingService } from '../services/meeting.service.js';
import {
  createMeetingSchema,
  meetingCodeParamSchema,
} from '../validators/meeting.validator.js';

export class MeetingController {
  constructor(
    private readonly meetingService: MeetingService,
    private readonly onMeetingEnded?: (meetingCode: string) => void
  ) {}

  public create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const validated = createMeetingSchema.parse(req.body);
      const hostUserId = req.user!.userId;

      const meeting = await this.meetingService.createMeeting({
        title: validated.title,
        hostUserId,
      });

      res.status(201).json({
        message: 'Meeting created successfully',
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public getByCode = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { meetingCode } = meetingCodeParamSchema.parse(req.params);
      const meeting = await this.meetingService.getMeetingByCode(meetingCode);

      res.status(200).json({
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public join = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { meetingCode } = meetingCodeParamSchema.parse(req.params);
      const userId = req.user!.userId;

      const result = await this.meetingService.joinMeeting(meetingCode, userId);

      res.status(200).json({
        message: 'Joined meeting successfully',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  public end = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { meetingCode } = meetingCodeParamSchema.parse(req.params);
      const userId = req.user!.userId;

      const meeting = await this.meetingService.endMeeting(meetingCode, userId);

      // Notify active WebRTC socket peers in this meeting room that the meeting was ended
      if (this.onMeetingEnded) {
        this.onMeetingEnded(meetingCode);
      }

      res.status(200).json({
        message: 'Meeting ended successfully',
        data: meeting,
      });
    } catch (error) {
      next(error);
    }
  };

  public list = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const userId = req.user!.userId;
      const meetings = await this.meetingService.listUserMeetings(userId);

      res.status(200).json({
        data: meetings,
      });
    } catch (error) {
      next(error);
    }
  };
}
