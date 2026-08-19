import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { MeetingController } from '../controllers/meeting.controller.js';
import { createAuthRoutes } from './auth.routes.js';
import { createMeetingRoutes } from './meeting.routes.js';

export function createApiRouter(
  authController: AuthController,
  meetingController: MeetingController
): Router {
  const router = Router();

  router.use('/auth', createAuthRoutes(authController));
  router.use('/meetings', createMeetingRoutes(meetingController));

  return router;
}
