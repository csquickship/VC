import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import { config } from './config/index.js';
import { UserRepository } from './repositories/postgres/user.repository.js';
import { MeetingRepository } from './repositories/postgres/meeting.repository.js';
import { AuthService } from './services/auth.service.js';
import { MeetingService } from './services/meeting.service.js';
import { AuthController } from './controllers/auth.controller.js';
import { MeetingController } from './controllers/meeting.controller.js';
import { createApiRouter } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { apiRateLimiter } from './middleware/rateLimiter.middleware.js';

export interface AppDependencies {
  onMeetingEnded?: (meetingCode: string) => void;
}

export function createApp(deps: AppDependencies = {}): {
  app: Express;
  authService: AuthService;
  meetingService: MeetingService;
} {
  const app = express();

  // 1. Configure CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or matching frontend
        if (!origin || origin === config.frontendOrigin || config.nodeEnv === 'development') {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // 2. Body Parser
  app.use(express.json({ limit: '1mb' }));

  // 3. Health Check Endpoint (Render requirement)
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // 4. Instantiate Repositories, Services, and Controllers
  const userRepository = new UserRepository();
  const meetingRepository = new MeetingRepository();

  const authService = new AuthService(userRepository);
  const meetingService = new MeetingService(meetingRepository);

  const authController = new AuthController(authService);
  const meetingController = new MeetingController(meetingService, deps.onMeetingEnded);

  // 5. Mount API Routes with Rate Limiting
  const apiRouter = createApiRouter(authController, meetingController);
  app.use('/api', apiRateLimiter, apiRouter);

  // 6. Centralized Error Handling Middleware
  app.use(errorHandler);

  return {
    app,
    authService,
    meetingService,
  };
}
