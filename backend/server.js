require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const compression = require("compression");
const cookieParser = require("cookie-parser");
const { connectDB } = require("./config/db.js");
const path = require("path");
const fs = require("fs");

// ✅ SOCKET.IO IMPORTS
const http = require("http");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");

// Import routes
const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const jobRoutes = require("./routes/jobRoutes.js");
const adminRoutes = require("./routes/adminRoutes.js");
const categoryRoutes = require("./routes/categoryRoutes.js");
const advertisementRoutes = require("./routes/advertisementRoutes.js");
const messageRoutes = require('./routes/messageRoutes.js');

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ CREATE HTTP SERVER FOR SOCKET.IO
const server = http.createServer(app);

// ✅ SOCKET.IO SERVER SETUP WITH ENHANCED CONFIGURATION
const io = socketIo(server, {
  cors: {
    origin: [
      CLIENT_URL, 
      "http://localhost:3000", 
      "http://localhost:5173",
      "http://10.25.40.157:5173",  // Your mobile access URL
      "https://yourdomain.com"     // Add your production domain here
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true
});

// ✅ CONNECTED USERS MANAGEMENT
const connectedUsers = new Map();
const userSockets = new Map();

// Enhanced CORS and Security
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));

// ✅ FIXED: Enhanced CORS for mobile access WITH PATCH METHOD
app.use(cors({ 
  origin: [
    CLIENT_URL, 
    "http://localhost:3000", 
    "http://localhost:5173",
    "http://10.25.40.157:5173"  // Your mobile access URL
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // ✅ ADDED PATCH!
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ✅ CRITICAL: JSON body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(morgan("dev"));
app.use(compression());

// ✅ SOCKET.IO MIDDLEWARE - Make io available to routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// ✅ UPDATED: Ensure upload directories exist (INCLUDING MESSAGES)
const uploadDirs = [
  path.join(__dirname, "uploads"),
  path.join(__dirname, "uploads/avatars"),
  path.join(__dirname, "uploads/certificates"), 
  path.join(__dirname, "uploads/portfolio"),
  path.join(__dirname, "uploads/categories"),
  path.join(__dirname, "uploads/ads"),
  path.join(__dirname, "uploads/advertisements"),
  path.join(__dirname, "uploads/advertisements/images"),
  path.join(__dirname, "uploads/advertisements/videos"),
  // ✅ NEW: Message uploads directory
  path.join(__dirname, "uploads/messages"),
  path.join(__dirname, "uploads/messages/thumbnails")
];

uploadDirs.forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`✅ Created directory: ${dir}`);
  } else {
    console.log(`📁 Directory exists: ${dir}`);
  }
});

// Static file serving with enhanced MIME type support
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=86400');
    
    const ext = path.extname(filePath).toLowerCase();
    switch (ext) {
      case '.jpg':
      case '.jpeg':
        res.set('Content-Type', 'image/jpeg');
        break;
      case '.png':
        res.set('Content-Type', 'image/png');
        break;
      case '.gif':
        res.set('Content-Type', 'image/gif');
        break;
      case '.webp':
        res.set('Content-Type', 'image/webp');
        break;
      case '.mp4':
        res.set('Content-Type', 'video/mp4');
        break;
      case '.avi':
        res.set('Content-Type', 'video/avi');
        break;
      case '.mov':
        res.set('Content-Type', 'video/quicktime');
        break;
      case '.wmv':
        res.set('Content-Type', 'video/x-ms-wmv');
        break;
      case '.pdf':
        res.set('Content-Type', 'application/pdf');
        break;
      // ✅ NEW: Message file types
      case '.doc':
        res.set('Content-Type', 'application/msword');
        break;
      case '.docx':
        res.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
        break;
      case '.txt':
        res.set('Content-Type', 'text/plain');
        break;
      case '.zip':
        res.set('Content-Type', 'application/zip');
        break;
      case '.rar':
        res.set('Content-Type', 'application/x-rar-compressed');
        break;
      default:
        res.set('Content-Type', 'application/octet-stream');
    }
  }
}));

// Enhanced request logging with messaging support
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  
  // Debug logging for experience routes
  if (req.method === 'PUT' && req.url.includes('/experience/')) {
    console.log('📝 Experience Update Request Body:', JSON.stringify(req.body, null, 2));
  }
  
  // ✅ NEW: Debug logging for messaging routes
  if (req.url.includes('/messages/')) {
    console.log('💬 Message Route Request:', {
      method: req.method,
      url: req.url,
      body: req.method === 'POST' ? req.body : 'GET request',
      contentType: req.get('Content-Type')
    });
  }
  
  next();
});

// ✅ SOCKET.IO AUTHENTICATION MIDDLEWARE
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    const decoded = jwt.verify(token.replace('Bearer ', ''), process.env.JWT_SECRET);
    const User = require('./models/User');
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return next(new Error('Authentication error: User not found'));
    }

    socket.userId = user._id.toString();
    socket.user = user;
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error: Invalid token'));
  }
};

// ✅ SOCKET.IO CONNECTION HANDLING
io.use(authenticateSocket);

io.on('connection', (socket) => {
  console.log(`✅ User connected: ${socket.user.name} (${socket.id})`);
  
  const userId = socket.userId;
  
  // Store user connection
  connectedUsers.set(userId, {
    socketId: socket.id,
    user: socket.user,
    connectedAt: new Date()
  });
  userSockets.set(socket.id, userId);

  // Join user's personal room
  socket.join(`user_${userId}`);
  console.log(`👤 User ${socket.user.name} joined room: user_${userId}`);

  // ✅ HANDLE MESSAGE SENDING
  socket.on('send-message', async (data) => {
    try {
      const { conversationId, message, receiverId } = data;
      
      console.log(`📨 Message from ${socket.user.name} to ${receiverId}:`, {
        conversationId,
        messageType: message.messageType,
        content: message.messageType === 'text' ? message.content?.text : message.messageType
      });

      // Emit to receiver
      socket.to(`user_${receiverId}`).emit('new-message', {
        conversationId,
        message,
        sender: {
          _id: userId,
          name: socket.user.name,
          avatar: socket.user.avatar
        }
      });

      // Emit delivery confirmation to sender
      socket.emit('message-delivered', {
        messageId: message._id,
        conversationId,
        deliveredAt: new Date()
      });

      // Update conversation participants
      socket.to(`conversation_${conversationId}`).emit('conversation-updated', {
        conversationId,
        lastMessage: {
          content: message.content?.text || `📎 ${message.messageType}`,
          timestamp: message.createdAt,
          senderId: userId,
          messageType: message.messageType
        }
      });

    } catch (error) {
      console.error('Error handling send-message:', error);
      socket.emit('message-error', {
        error: 'Failed to send message',
        details: error.message
      });
    }
  });

  // ✅ HANDLE CONVERSATION JOINING
  socket.on('join-conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
    console.log(`💬 User ${socket.user.name} joined conversation: ${conversationId}`);
  });

  // ✅ HANDLE CONVERSATION LEAVING
  socket.on('leave-conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
    console.log(`👋 User ${socket.user.name} left conversation: ${conversationId}`);
  });

  // ✅ HANDLE TYPING INDICATORS
  socket.on('typing', (data) => {
    const { conversationId, userName } = data;
    socket.to(`conversation_${conversationId}`).emit('user-typing', {
      conversationId,
      userName: userName || socket.user.name,
      userId
    });
  });

  socket.on('stop-typing', (data) => {
    const { conversationId } = data;
    socket.to(`conversation_${conversationId}`).emit('user-stopped-typing', {
      conversationId,
      userId
    });
  });

  // ✅ HANDLE MESSAGE READ RECEIPTS
  socket.on('message-read', async (data) => {
    try {
      const { messageId, conversationId, senderId } = data;
      
      // Emit read receipt to sender
      socket.to(`user_${senderId}`).emit('message-read', {
        messageId,
        conversationId,
        readBy: {
          userId,
          userName: socket.user.name,
          readAt: new Date()
        }
      });

    } catch (error) {
      console.error('Error handling message-read:', error);
    }
  });

  // ✅ HANDLE USER STATUS
  socket.on('update-status', (status) => {
    const userConnection = connectedUsers.get(userId);
    if (userConnection) {
      userConnection.status = status;
      userConnection.lastActivity = new Date();
      
      // Broadcast status to user's contacts
      socket.broadcast.emit('user-status-updated', {
        userId,
        status,
        lastActivity: userConnection.lastActivity
      });
    }
  });

  // ✅ HANDLE GET ONLINE USERS
  socket.on('get-online-users', () => {
    const onlineUsers = Array.from(connectedUsers.entries()).map(([userId, data]) => ({
      userId,
      name: data.user.name,
      avatar: data.user.avatar,
      status: data.status || 'online',
      lastActivity: data.lastActivity || data.connectedAt
    }));

    socket.emit('online-users', onlineUsers);
  });

  // ✅ HANDLE DISCONNECTION
  socket.on('disconnect', () => {
    console.log(`❌ User disconnected: ${socket.user.name} (${socket.id})`);
    
    // Remove from connected users
    connectedUsers.delete(userId);
    userSockets.delete(socket.id);
    
    // Broadcast offline status
    socket.broadcast.emit('user-status-updated', {
      userId,
      status: 'offline',
      lastActivity: new Date()
    });
  });

  // ✅ HANDLE CONNECTION ERRORS
  socket.on('error', (error) => {
    console.error(`Socket error for user ${socket.user.name}:`, error);
  });

  // Send welcome message
  socket.emit('connected', {
    message: 'Connected to real-time messaging',
    userId,
    socketId: socket.id,
    connectedAt: new Date()
  });
});

// ✅ SOCKET.IO ERROR HANDLING
io.on('connect_error', (error) => {
  console.error('Socket.io connection error:', error);
});

// Make io available to routes
app.set('io', io);

// ✅ API Routes - mounted AFTER middleware
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/admin/categories", categoryRoutes);
app.use("/api/advertisements", advertisementRoutes);
// ✅ MESSAGING ROUTES - PROPERLY MOUNTED
app.use('/api/messages', messageRoutes);

// ✅ UPDATED: Enhanced health check with Socket.io support
app.get("/api/health", (req, res) => {
  const getDirectoryFileCount = (dirPath) => {
    try {
      return fs.existsSync(dirPath) ? fs.readdirSync(dirPath).length : 0;
    } catch (error) {
      return 0;
    }
  };

  const onlineUsersCount = connectedUsers.size;
  const activeConnections = io.engine.clientsCount;

  res.json({ 
    ok: true, 
    time: new Date(),
    message: "Server is running with real-time messaging support",
    express_version: "5.x",
    socketio_version: require('socket.io/package.json').version,
    features: {
      messaging: true,
      fileSharing: true,
      realTime: true,
      socketio: true
    },
    realtime: {
      onlineUsers: onlineUsersCount,
      activeConnections,
      connectedClients: Array.from(connectedUsers.values()).map(user => ({
        name: user.user.name,
        connectedAt: user.connectedAt,
        status: user.status || 'online'
      }))
    },
    middleware: {
      jsonParsingEnabled: true,
      corsEnabled: true,
      messagingEnabled: true,
      socketioEnabled: true
    },
    uploads: {
      avatars: getDirectoryFileCount(path.join(__dirname, "uploads/avatars")),
      certificates: getDirectoryFileCount(path.join(__dirname, "uploads/certificates")),
      portfolio: getDirectoryFileCount(path.join(__dirname, "uploads/portfolio")),
      categories: getDirectoryFileCount(path.join(__dirname, "uploads/categories")),
      // ✅ NEW: Messages upload stats
      messages: getDirectoryFileCount(path.join(__dirname, "uploads/messages")),
      messageThumbnails: getDirectoryFileCount(path.join(__dirname, "uploads/messages/thumbnails")),
      advertisements: {
        images: getDirectoryFileCount(path.join(__dirname, "uploads/advertisements/images")),
        videos: getDirectoryFileCount(path.join(__dirname, "uploads/advertisements/videos"))
      }
    },
    // ✅ NEW: Available messaging endpoints
    messagingEndpoints: [
      "GET /api/messages/conversations",
      "GET /api/messages/conversation/:conversationId", 
      "POST /api/messages/send",
      "POST /api/messages/conversation",
      "POST /api/messages/upload",
      "PUT /api/messages/read/:conversationId",
      "GET /api/messages/search",
      "GET /api/messages/unread-count",
      "DELETE /api/messages/:messageId",
      "PUT /api/messages/conversation/:conversationId/archive"
    ],
    // ✅ NEW: Socket.io events
    socketEvents: [
      "send-message",
      "join-conversation", 
      "leave-conversation",
      "typing",
      "stop-typing",
      "message-read",
      "update-status",
      "get-online-users"
    ]
  });
});

// Enhanced error handling with messaging support
app.use((err, req, res, next) => {
  console.error("❌ Global Error Handler:", err);
  
  // Special logging for experience route errors
  if (req.url.includes('/experience/')) {
    console.error("❌ Experience Route Error:");
    console.error("   Method:", req.method);
    console.error("   URL:", req.url);
    console.error("   Body:", JSON.stringify(req.body, null, 2));
    console.error("   Error:", err.message);
  }
  
  // ✅ NEW: Special logging for messaging route errors
  if (req.url.includes('/messages/')) {
    console.error("❌ Messaging Route Error:");
    console.error("   Method:", req.method);
    console.error("   URL:", req.url);
    console.error("   Body:", JSON.stringify(req.body, null, 2));
    console.error("   Files:", req.files ? Object.keys(req.files) : 'No files');
    console.error("   Error:", err.message);
    console.error("   Stack:", err.stack);
  }
  
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      success: false,
      message: 'Validation error',
      errors: errors
    });
  }
  
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format',
      error: 'Invalid identifier provided'
    });
  }
  
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'Duplicate field error',
      error: 'Resource already exists'
    });
  }

  // ✅ NEW: Handle file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File too large',
      error: 'File size exceeds limit'
    });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      success: false,
      message: 'Unexpected file field',
      error: 'Invalid file upload'
    });
  }

  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || "Internal server error",
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong!'
  });
});

// ✅ UPDATED: Express v5 compatible 404 handler with messaging endpoints
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({ 
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/users/profile",
      "PUT /api/users/profile", 
      "POST /api/users/profile/experience",
      "PUT /api/users/profile/experience/:experienceId",
      "DELETE /api/users/profile/experience/:experienceId",
      // ✅ NEW: Messaging endpoints in 404 response
      "GET /api/messages/conversations",
      "GET /api/messages/conversation/:conversationId",
      "POST /api/messages/send",
      "POST /api/messages/upload",
      "PUT /api/messages/read/:conversationId",
      "GET /api/messages/search",
      "GET /api/messages/unread-count"
    ],
    realTimeEndpoints: [
      "Socket.io connection on same port",
      "Events: send-message, typing, join-conversation"
    ]
  });
});

// ✅ UPDATED: Start server with Socket.io support
connectDB()
  .then(() => {
    console.log("✅ Database connected successfully");

    // Use server.listen instead of app.listen for Socket.io
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 Server running on http://0.0.0.0:${PORT}`);
      console.log(`🌐 Network access: http://10.25.40.157:${PORT}`);
      console.log(`📁 Static Files: http://10.25.40.157:${PORT}/uploads/`);
      console.log(`🧪 Health Check: http://10.25.40.157:${PORT}/api/health`);
      console.log(`📢 Mobile Ready: http://10.25.40.157:${PORT}`);
      console.log(`✅ Express v5 Compatible: YES`);
      console.log(`✅ Experience Routes: WORKING`);
      // ✅ NEW: Real-time messaging status
      console.log(`💬 Messaging System: ENABLED`);
      console.log(`📎 File Sharing: ENABLED`);
      console.log(`🔄 Real-time Socket.io: RUNNING`);
      console.log(`🌐 Socket.io CORS: CONFIGURED`);
      console.log(`🔐 Socket Authentication: ENABLED`);
      console.log(`\n📋 Available Upload Directories:`);
      uploadDirs.forEach(dir => {
        const relativePath = path.relative(__dirname, dir);
        const exists = fs.existsSync(dir);
        console.log(`   ${exists ? '✅' : '❌'} ${relativePath}`);
      });
      console.log(`\n💬 Messaging API Endpoints:`);
      console.log(`   GET    /api/messages/conversations`);
      console.log(`   GET    /api/messages/conversation/:id`);
      console.log(`   POST   /api/messages/send`);
      console.log(`   POST   /api/messages/upload`);
      console.log(`   PUT    /api/messages/read/:id`);
      console.log(`   GET    /api/messages/search`);
      console.log(`   GET    /api/messages/unread-count`);
      console.log(`\n🔄 Socket.io Real-time Events:`);
      console.log(`   📨 send-message - Send messages instantly`);
      console.log(`   💬 join-conversation - Join conversation rooms`);
      console.log(`   ⌨️  typing - Show typing indicators`);
      console.log(`   👀 message-read - Read receipts`);
      console.log(`   🟢 update-status - Online/offline status`);
      console.log(`   👥 get-online-users - Get online users list`);
      console.log(`\n🎯 Integration Points:`);
      console.log(`   📱 Applications.jsx ➜ Message Client Button`);
      console.log(`   💬 Messages.jsx ➜ Complete Messaging UI + Socket.io`);
      console.log(`   📎 File Upload ➜ Images, Documents, Files`);
      console.log(`   🔔 Real-time ➜ Socket.io ACTIVE`);
      console.log(`   📲 Mobile Support ➜ Responsive + Touch-friendly`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
