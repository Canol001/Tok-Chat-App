const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const chatRoutes = require('./routes/chatRoutes');

const CLIENT_URL = 'http://localhost:5173';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 5000;

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Error:', err));

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true, // 👈 this is KEY when you're sending cookies or auth headers
}));

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', chatRoutes);

// Socket.IO real-time handling
io.on('connection', (socket) => {
  console.log('⚡ A user connected:', socket.id);

  socket.on('sendMessage', (msg) => {
    io.emit('newMessage', msg); // Broadcast to everyone
  });

  socket.on('disconnect', () => {
    console.log('🚪 User disconnected:', socket.id);
  });
});

// Start server
server.listen(PORT, () =>
  console.log(`🚀 Server + Socket.IO running at http://localhost:${PORT}`)
);
