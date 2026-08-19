import { Router } from 'express';
import { MeetingController } from '../controllers/meeting.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

export function createMeetingRoutes(meetingController: MeetingController): Router {
  const router = Router();

  // All meeting endpoints require authentication
  router.use(authMiddleware);

  router.post('/', meetingController.create);
  router.get('/', meetingController.list);
  router.get('/:meetingCode', meetingController.getByCode);
  router.post('/:meetingCode/join', meetingController.join);
  router.post('/:meetingCode/end', meetingController.end);

  return router;
}
