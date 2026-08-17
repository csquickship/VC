"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.httpServer = exports.app = void 0;
const http_1 = __importDefault(require("http"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const config_js_1 = require("./config.js");
const signalingServer_js_1 = require("./signaling/signalingServer.js");
function log(level, message, meta) {
    const timestamp = new Date().toISOString();
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    console.log(`[${timestamp}] [${level}] [SERVER] ${message}${metaStr}`);
}
const app = (0, express_1.default)();
exports.app = app;
// Enable CORS middleware for REST API
app.use((0, cors_1.default)({
    origin: config_js_1.config.frontendOrigin,
    credentials: true,
}));
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
});
// Create HTTP server
const httpServer = http_1.default.createServer(app);
exports.httpServer = httpServer;
// Attach Socket.IO signaling server
const io = (0, signalingServer_js_1.createSignalingServer)(httpServer);
exports.io = io;
// Start server
httpServer.listen(config_js_1.config.port, () => {
    log('INFO', `Server listening on port ${config_js_1.config.port}`, {
        port: config_js_1.config.port,
        frontendOrigin: config_js_1.config.frontendOrigin,
    });
});
// Graceful Shutdown handling
function handleShutdown(signal) {
    log('INFO', `Received ${signal}. Initiating graceful shutdown...`);
    // Stop accepting new socket connections and disconnect active sockets
    io.close(() => {
        log('INFO', 'Socket.IO server closed.');
    });
    // Close HTTP server
    httpServer.close((err) => {
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
