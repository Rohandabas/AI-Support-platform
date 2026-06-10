import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

dotenv.config();

import { connectDB } from './config/db';
import { errorHandler } from './middleware/errorHandler';

// Routes
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import documentsRoutes from './routes/documents';
import aiConfigRoutes from './routes/aiConfig';
import chatRoutes from './routes/chat';
import conversationsRoutes from './routes/conversations';
import ticketsRoutes from './routes/tickets';
import escalationsRoutes from './routes/escalations';
import analyticsRoutes from './routes/analytics';
import widgetRoutes from './routes/widget';

const app = express();
const httpServer = createServer(app);

// Socket.io setup for live chat / human handoff
export const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or file:/// local previews)
    if (!origin || origin === 'null') return callback(null, true);
    return callback(null, true); // Allow any other origin
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use('/uploads', express.static(uploadDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ai-config', aiConfigRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/conversations', conversationsRoutes);
app.use('/api/tickets', ticketsRoutes);
app.use('/api/escalations', escalationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/widget', widgetRoutes);

// Widget static files
app.use('/widget', express.static(path.join(__dirname, '../../widget')));

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// Socket.io for human handoff
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('join-conversation', (conversationId: string) => {
    socket.join(`conversation:${conversationId}`);
    console.log(`Socket ${socket.id} joined conversation ${conversationId}`);
  });

  socket.on('admin-join', (data: { conversationId: string; adminName: string }) => {
    const room = `conversation:${data.conversationId}`;
    socket.join(room);
    io.to(room).emit('admin-joined', {
      message: `Agent ${data.adminName} has joined the conversation`,
      timestamp: new Date(),
    });
  });

  socket.on('admin-message', (data: { conversationId: string; message: string; adminName: string }) => {
    const room = `conversation:${data.conversationId}`;
    io.to(room).emit('new-message', {
      role: 'agent',
      content: data.message,
      agentName: data.adminName,
      timestamp: new Date(),
    });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

const start = async () => {
  await connectDB();
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 WebSocket ready`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
};

start().catch(console.error);

export default app;
