import http from 'http';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { config } from './config.js';
import { createSignalingServer } from './signaling/signalingServer.js';

function log(level: 'INFO' | 'ERROR', message: string, meta?: Record<string, unknown>): void {
  const timestamp = new Date().toISOString();
  const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [${level}] [SERVER] ${message}${metaStr}`);
}

const app = express();

// Enable CORS middleware for REST API
app.use(
  cors({
    origin: config.frontendOrigin,
    credentials: true,
  })
);

app.use(express.json());

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

// Create HTTP server
const httpServer = http.createServer(app);

// Attach Socket.IO signaling server
const io = createSignalingServer(httpServer);

// Start server
httpServer.listen(config.port, () => {
  log('INFO', `Server listening on port ${config.port}`, {
    port: config.port,
    frontendOrigin: config.frontendOrigin,
  });
});

// Graceful Shutdown handling
function handleShutdown(signal: string): void {
  log('INFO', `Received ${signal}. Initiating graceful shutdown...`);

  // Stop accepting new socket connections and disconnect active sockets
  io.close(() => {
    log('INFO', 'Socket.IO server closed.');
  });

  // Close HTTP server
  httpServer.close((err?: Error) => {
    if (err) {
      log('ERROR', 'Error closing HTTP server:', { error: err.message });
      process.exit(1);
    }
    log('INFO', 'HTTP server closed gracefully.');
    process.exit(0);
  });

  // Force shutdown if cleanup takes longer than 10 seconds
  setTimeout(() => {
    log('ERROR', 'Forced shutdown due to timeout.');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export { app, httpServer, io };
