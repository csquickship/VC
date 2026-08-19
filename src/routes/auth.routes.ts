import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { authRateLimiter } from '../middleware/rateLimiter.middleware.js';

export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  router.post('/register', authRateLimiter, authController.register);
  router.post('/login', authRateLimiter, authController.login);
  router.post('/logout', authMiddleware, authController.logout);
  router.get('/me', authMiddleware, authController.me);

  return router;
}
