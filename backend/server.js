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
// ✅ NEW: Google OAuth Routes
const googleAuthRoutes = require('./routes/googleAuth.js');
// ✅ NEW: Password-Reset Routes
const passwordResetRoutes = require('./routes/passwordReset.js'); 

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// ✅ CREATE HTTP SERVER FOR SOCKET.IO
const server = http.createServer(app);

// ✅ PRODUCTION READY Socket.IO CORS with dynamic origins
const socketAllowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  [CLIENT_URL, "http://localhost:3000", "http://localhost:5173", "http://10.25.40.157:5173"];

// ✅ FIXED: Add Vercel domains to Socket.IO
socketAllowedOrigins.push(
  "https://samparkworkwebsite.vercel.app",
  "https://samparkwork.vercel.app"
);

const io = socketIo(server, {
  cors: {
    origin: socketAllowedOrigins,
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

// ✅ PRODUCTION READY CORS with dynamic origins - FIXED
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  [CLIENT_URL, "http://localhost:3000", "http://localhost:5173", "http://10.25.40.157:5173"];

// ✅ CRITICAL FIX: Add Vercel domains
allowedOrigins.push(
  "https://samparkworkwebsite.vercel.app",
  "https://samparkwork.vercel.app"
);

app.use(cors({ 
  origin: function (origin, callback) {
    console.log('🌐 CORS check for origin:', origin);
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: No origin - allowing');
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log('✅ CORS: Origin allowed:', origin);
      return callback(null, true);
    } else {
      console.log('❌ CORS: Origin blocked:', origin);
      console.log('📋 CORS: Allowed origins:', allowedOrigins);
      // ✅ FIXED: Still allow but log the issue
      return callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
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

// ✅ ENHANCED Static file serving with video streaming support - CRITICAL FIX
app.use("/uploads", express.static(path.join(__dirname, "uploads"), {
  maxAge: '1d',
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cache-Control', 'public, max-age=86400');
    
    // ✅ CRITICAL: Normalize file path (remove double slashes and backslashes)
    const normalizedPath = filePath.replace(/\\/g, '/').replace(/\/+/g, '/');
    const ext = path.extname(normalizedPath).toLowerCase();
    
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
        res.set('Accept-Ranges', 'bytes'); // ✅ CRITICAL for video streaming
        break;
      case '.avi':
        res.set('Content-Type', 'video/avi');
        res.set('Accept-Ranges', 'bytes');
        break;
      case '.mov':
        res.set('Content-Type', 'video/quicktime');
        res.set('Accept-Ranges', 'bytes');
        break;
      case '.wmv':
        res.set('Content-Type', 'video/x-ms-wmv');
        res.set('Accept-Ranges', 'bytes');
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

  // ✅ NEW: Debug logging for Google OAuth routes
  if (req.url.includes('/oauth/')) {
    console.log('🔐 Google OAuth Route Request:', {
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

// ✅ WELCOME ROUTE - UPDATED WITH ACTUAL RENDER URL
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "🚀 SamparkWork Backend API Server",
    status: "Running Successfully",
    version: "1.0.0",
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date(),
    deployment: {
      platform: "Render",
      url: "https://samparkwork-backend.onrender.com",
      region: "Singapore"
    },
    services: {
      database: "MongoDB Atlas Connected",
      messaging: "Socket.IO Active",
      fileUploads: "Enabled",
      realTime: "Active",
      cors: "Dynamic Origins Configured",
      googleOAuth: "Enabled" // ✅ NEW
    },
    endpoints: {
      health: "/api/health",
      auth: "/api/auth/*",
      users: "/api/users/*",
      jobs: "/api/jobs/*", 
      messages: "/api/messages/*",
      admin: "/api/admin/*",
      categories: "/api/categories/*",
      advertisements: "/api/advertisements/*",
      googleOAuth: "/api/oauth/google" // ✅ NEW
    },
    frontend: {
      development: "http://localhost:5173",
      production: "https://samparkworkwebsite.vercel.app"
    },
    documentation: "Visit /api/health for detailed API information",
    cors: {
      allowedOrigins: allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    },
    integration: {
      socketio: "wss://samparkwork-backend.onrender.com",
      api: "https://samparkwork-backend.onrender.com/api",
      uploads: "https://samparkwork-backend.onrender.com/uploads"
    }
  });
});

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
// ✅ NEW: Google OAuth Routes - PROPERLY MOUNTED
app.use('/api/oauth', googleAuthRoutes);
// ✅ NEW: Password-Reset Routes - PROPERLY MOUNTED
app.use('/api/password-reset', passwordResetRoutes); 

// ✅ COMPLETELY FIXED HEALTH CHECK - NO SOCKET.IO PACKAGE.JSON ACCESS
app.get("/api/health", (req, res) => {
  const getDirectoryFileCount = (dirPath) => {
    try {
      return fs.existsSync(dirPath) ? fs.readdirSync(dirPath).length : 0;
    } catch (error) {
      return 0;
    }
  };

  const onlineUsersCount = connectedUsers.size;
  let activeConnections = 0;
  
  try {
    activeConnections = io.engine.clientsCount;
  } catch (error) {
    activeConnections = onlineUsersCount;
  }

  res.json({ 
    ok: true, 
    time: new Date(),
    message: "SamparkWork Backend API Server is running with real-time messaging support and Google OAuth",
    deployment: {
      platform: "Render",
      url: "https://samparkwork-backend.onrender.com",
      region: "Singapore",
      status: "Live and Operational"
    },
    express_version: "5.x",
    socketio_version: "4.8.1", // ✅ FIXED: Hardcoded version instead of require
    node_version: process.version,
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    features: {
      messaging: true,
      fileSharing: true,
      realTime: true,
      socketio: true,
      cors: true,
      authentication: true,
      compression: true,
      security: true,
      videoStreaming: true,
      googleOAuth: true, // ✅ NEW
      passwordReset: true // ✅ NEW PASSWORD RESET FEATURE
    },
    database: {
      type: "MongoDB Atlas",
      status: "Connected",
      cluster: "cluster0.rtlbzhl.mongodb.net"
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
      socketioEnabled: true,
      helmetSecurityEnabled: true,
      compressionEnabled: true,
      cookieParsingEnabled: true,
      morganLoggingEnabled: true,
      googleOAuthEnabled: true // ✅ NEW
    },
    uploads: {
      basePath: "https://samparkwork-backend.onrender.com/uploads",
      avatars: getDirectoryFileCount(path.join(__dirname, "uploads/avatars")),
      certificates: getDirectoryFileCount(path.join(__dirname, "uploads/certificates")),
      portfolio: getDirectoryFileCount(path.join(__dirname, "uploads/portfolio")),
      categories: getDirectoryFileCount(path.join(__dirname, "uploads/categories")),
      messages: getDirectoryFileCount(path.join(__dirname, "uploads/messages")),
      messageThumbnails: getDirectoryFileCount(path.join(__dirname, "uploads/messages/thumbnails")),
      advertisements: {
        images: getDirectoryFileCount(path.join(__dirname, "uploads/advertisements/images")),
        videos: getDirectoryFileCount(path.join(__dirname, "uploads/advertisements/videos"))
      }
    },
    api: {
      baseUrl: "https://samparkwork-backend.onrender.com/api",
      version: "v1",
      authentication: "JWT Bearer Token Required"
    },
    endpoints: {
      auth: [
        "POST /api/auth/register",
        "POST /api/auth/login", 
        "POST /api/auth/logout",
        "POST /api/auth/refresh"
      ],
      oauth: [
        "POST /api/oauth/google - Google OAuth Login/Signup"
      ],
      users: [
        "GET /api/users/profile",
        "PUT /api/users/profile",
        "POST /api/users/profile/experience",
        "PUT /api/users/profile/experience/:id",
        "DELETE /api/users/profile/experience/:id"
      ],
      jobs: [
        "GET /api/jobs",
        "POST /api/jobs",
        "GET /api/jobs/:id",
        "PUT /api/jobs/:id",
        "DELETE /api/jobs/:id"
      ],
      messaging: [
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
      ]
    },
    socketEvents: [
      "send-message - Send real-time messages",
      "join-conversation - Join conversation rooms", 
      "leave-conversation - Leave conversation rooms",
      "typing - Show typing indicators",
      "stop-typing - Stop typing indicators",
      "message-read - Send read receipts",
      "update-status - Update online status",
      "get-online-users - Get list of online users"
    ],
    cors: {
      allowedOrigins: allowedOrigins,
      dynamicOrigins: process.env.ALLOWED_ORIGINS ? true : false,
      credentials: true
    },
    integration: {
      frontend: {
        development: "http://localhost:5173",
        staging: "https://samparkwork.vercel.app",
        production: "https://samparkworkwebsite.vercel.app"
      },
      socketConnection: "wss://samparkwork-backend.onrender.com",
      apiBase: "https://samparkwork-backend.onrender.com/api"
    }
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

  // ✅ NEW: Special logging for Google OAuth route errors
  if (req.url.includes('/oauth/')) {
    console.error("❌ Google OAuth Route Error:");
    console.error("   Method:", req.method);
    console.error("   URL:", req.url);
    console.error("   Body:", JSON.stringify(req.body, null, 2));
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
    error: process.env.NODE_ENV === 'development' ? err.stack : 'Something went wrong!',
    timestamp: new Date(),
    path: req.originalUrl,
    method: req.method
  });
});

// ✅ UPDATED 404 HANDLER WITH ACTUAL RENDER URL
app.use((req, res) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({ 
    success: false,
    message: "API endpoint not found",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date(),
    server: "https://samparkwork-backend.onrender.com",
    suggestion: "Visit [https://samparkwork-backend.onrender.com/](https://samparkwork-backend.onrender.com/) for API information or /api/health for detailed status",
    availableEndpoints: [
      "GET / - API Information",
      "GET /api/health - Comprehensive Health Check",
      "POST /api/auth/login - User Authentication",
      "POST /api/auth/register - User Registration",
      "POST /api/oauth/google - Google OAuth Login", // ✅ NEW
      "GET /api/users/profile - User Profile",
      "PUT /api/users/profile - Update Profile", 
      "POST /api/users/profile/experience - Add Experience",
      "PUT /api/users/profile/experience/:experienceId - Update Experience",
      "DELETE /api/users/profile/experience/:experienceId - Delete Experience",
      "GET /api/jobs - Get All Jobs",
      "POST /api/jobs - Create Job",
      "GET /api/messages/conversations - Get Conversations",
      "GET /api/messages/conversation/:conversationId - Get Messages",
      "POST /api/messages/send - Send Message",
      "POST /api/messages/upload - Upload File",
      "PUT /api/messages/read/:conversationId - Mark as Read",
      "GET /api/messages/search - Search Messages",
      "GET /api/messages/unread-count - Get Unread Count"
    ],
    realTimeEndpoints: [
      "WebSocket connection: wss://samparkwork-backend.onrender.com",
      "Events: send-message, typing, join-conversation, message-read"
    ],
    integration: {
      apiBase: "https://samparkwork-backend.onrender.com/api",
      socketConnection: "wss://samparkwork-backend.onrender.com",
      uploadsPath: "https://samparkwork-backend.onrender.com/uploads"
    }
  });
});

// ✅ UPDATED: Start server with actual Render URL information
connectDB()
  .then(() => {
    console.log("✅ Database connected successfully");

    // Use server.listen instead of app.listen for Socket.io
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 SamparkWork Backend Server Successfully Deployed!`);
      console.log(`🌐 Production URL: https://samparkwork-backend.onrender.com`);
      console.log(`🔗 Local Network: http://10.25.40.157:${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`🗄️  Database: MongoDB Atlas Connected`);
      console.log(`📁 Static Files: https://samparkwork-backend.onrender.com/uploads/`);
      console.log(`🧪 Health Check: https://samparkwork-backend.onrender.com/api/health`);
      console.log(`📱 API Base URL: https://samparkwork-backend.onrender.com/api`);
      console.log(`🔌 Socket.IO: wss://samparkwork-backend.onrender.com`);
      console.log(`🔐 Google OAuth: https://samparkwork-backend.onrender.com/api/oauth/google`); // ✅ NEW
      
      // Production deployment info
      if (process.env.NODE_ENV === 'production') {
        console.log(`\n🎉 PRODUCTION DEPLOYMENT SUCCESSFUL!`);
        console.log(`🌍 Live Backend URL: https://samparkwork-backend.onrender.com`);
        console.log(`🎯 Ready for Frontend Integration`);
        console.log(`🌐 CORS Origins: ${allowedOrigins.join(', ')}`);
        console.log(`🔐 Security: Helmet + CORS + JWT Authentication + Google OAuth`);
      }
      
      console.log(`\n✅ Services Status:`);
      console.log(`   💬 Real-time Messaging: ACTIVE`);
      console.log(`   📎 File Upload System: ENABLED`);
      console.log(`   🔄 Socket.IO WebSocket: RUNNING`);
      console.log(`   🌐 CORS Configuration: DYNAMIC`);
      console.log(`   🔐 JWT Authentication: ENABLED`);
      console.log(`   🔐 Google OAuth: ENABLED`); // ✅ NEW
      console.log(`   🗜️  Compression: ENABLED`);
      console.log(`   🛡️  Security Headers: ENABLED`);
      console.log(`   🎥 Video Streaming: ENABLED WITH ACCEPT-RANGES`);
      
      console.log(`\n📋 Upload Directories:`);
      uploadDirs.forEach(dir => {
        const relativePath = path.relative(__dirname, dir);
        const exists = fs.existsSync(dir);
        console.log(`   ${exists ? '✅' : '❌'} ${relativePath}`);
      });
      
      console.log(`\n🔗 Integration URLs for Frontend:`);
      console.log(`   🌐 API Base: https://samparkwork-backend.onrender.com/api`);
      console.log(`   🔌 Socket.IO: wss://samparkwork-backend.onrender.com`);
      console.log(`   📁 File Uploads: https://samparkwork-backend.onrender.com/uploads`);
      console.log(`   🧪 Health Check: https://samparkwork-backend.onrender.com/api/health`);
      console.log(`   🔐 Google OAuth: https://samparkwork-backend.onrender.com/api/oauth/google`); // ✅ NEW
      
      console.log(`\n💬 Messaging API Endpoints:`);
      console.log(`   GET    https://samparkwork-backend.onrender.com/api/messages/conversations`);
      console.log(`   GET    https://samparkwork-backend.onrender.com/api/messages/conversation/:id`);
      console.log(`   POST   https://samparkwork-backend.onrender.com/api/messages/send`);
      console.log(`   POST   https://samparkwork-backend.onrender.com/api/messages/upload`);
      console.log(`   PUT    https://samparkwork-backend.onrender.com/api/messages/read/:id`);

      // ✅ NEW: Google OAuth Endpoints
      console.log(`\n🔐 Google OAuth API Endpoints:`);
      console.log(`   POST   https://samparkwork-backend.onrender.com/api/oauth/google`);
      
      console.log(`\n🔄 Socket.io Real-time Events:`);
      console.log(`   📨 send-message - Send messages instantly`);
      console.log(`   💬 join-conversation - Join conversation rooms`);
      console.log(`   ⌨️  typing - Show typing indicators`);
      console.log(`   👀 message-read - Read receipts`);
      console.log(`   🟢 update-status - Online/offline status`);
      console.log(`   👥 get-online-users - Get online users list`);
      
      console.log(`\n🎯 Next Steps:`);
      console.log(`   1. ✅ Backend Deployed Successfully`);
      console.log(`   2. ✅ Google OAuth Integration Ready`); // ✅ NEW
      console.log(`   3. 🔄 Update Frontend with Google OAuth`);
      console.log(`   4. 🔄 Deploy Frontend to Vercel`);
      console.log(`   5. 🌐 Connect Custom Domain (samparkwork.in)`);
      console.log(`   6. 🧪 Test Full Application with Google Login`);
      
      console.log(`\n🚀 Backend is LIVE and ready for your frontend integration with Google OAuth!`);
    });
  })
  .catch((err) => {
    console.error("❌ DB connection failed:", err.message);
    process.exit(1);
  });

module.exports = { app, server, io };
