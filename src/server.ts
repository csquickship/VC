import http from 'http';
import { config } from './config/index.js';
import { log } from './utils/logger.js';
import { createApp } from './app.js';
import { createSignalingServer } from './websocket/signalingServer.js';
import { prisma } from './repositories/postgres/prisma.client.js';

// Create placeholder HTTP server
const httpServer = http.createServer();

// Attach Socket.IO signaling server
const signaling = createSignalingServer(httpServer);

// Create Express app with meeting-ended notifier hooked to signaling server
const { app } = createApp({
  onMeetingEnded: (meetingCode: string) => {
    signaling.notifyMeetingEnded(meetingCode);
  },
});

// Attach Express request listener to HTTP server
httpServer.on('request', app);

// Start listening on 0.0.0.0 for Render Free compatibility
const host = '0.0.0.0';
httpServer.listen(config.port, host, () => {
  log('INFO', 'SERVER', `Server listening on ${host}:${config.port}`, {
    port: config.port,
    frontendOrigin: config.frontendOrigin,
    env: config.nodeEnv,
  });
});

// Graceful Shutdown handling
let isShuttingDown = false;

async function handleShutdown(signal: string): Promise<void> {
  if (isShuttingDown) return;
  isShuttingDown = true;

  log('INFO', 'SERVER', `Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new socket connections and disconnect active sockets
  signaling.io.close(() => {
    log('INFO', 'SERVER', 'Socket.IO server closed.');
  });

  // Close HTTP server
  httpServer.close(async (err?: Error) => {
    if (err) {
      log('ERROR', 'SERVER', 'Error closing HTTP server:', { error: err.message });
    } else {
      log('INFO', 'SERVER', 'HTTP server closed gracefully.');
    }

    try {
      await prisma.$disconnect();
      log('INFO', 'SERVER', 'Prisma database connection closed.');
    } catch (dbErr) {
      log('ERROR', 'SERVER', 'Error disconnecting Prisma:', { error: (dbErr as Error).message });
    }

    process.exit(err ? 1 : 0);
  });

  // Force shutdown if cleanup takes longer than 10 seconds
  setTimeout(() => {
    log('ERROR', 'SERVER', 'Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => void handleShutdown('SIGINT'));
process.on('SIGTERM', () => void handleShutdown('SIGTERM'));

export { app, httpServer, signaling };
