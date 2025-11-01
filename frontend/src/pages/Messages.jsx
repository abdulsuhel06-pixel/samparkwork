import React, { useState, useEffect, useContext, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { apiHelpers, handleApiError, getImageUrl, socketHelpers, utils } from '../services/api';
import { 
  ArrowLeft, Send, Search, MoreHorizontal,
  Paperclip, Check, CheckCheck, Clock, AlertCircle, 
  Loader, MessageSquare, Star, User, Briefcase, Building,
  Filter, Archive, Settings, Plus, X, FileText, Image as ImageIcon,
  Download, Eye, Calendar, MapPin, Trash2, Menu
} from 'lucide-react';
import { io } from 'socket.io-client';
import './Messages.css';

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, isAuthenticated } = useContext(AuthContext);
  
  // State management
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [error, setError] = useState(null);
  
  // ✅ ENHANCED RESPONSIVE STATE - PERFECTLY MATCHING CSS
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
  const [showSidebar, setShowSidebar] = useState(true);
  
  // ✅ ENHANCED REAL-TIME MESSAGING STATE - WHATSAPP STYLE
  const [isConnected, setIsConnected] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [messageDeliveryStatus, setMessageDeliveryStatus] = useState(new Map());
  const [unreadCounts, setUnreadCounts] = useState(new Map());
  
  // ✅ CRITICAL FIX: PERFECT DELETE BUTTON STATE - DESKTOP HOVER + MOBILE TAP
  const [deletingMessage, setDeletingMessage] = useState(null);
  const [deletingConversation, setDeletingConversation] = useState(null);
  const [showConversationOptions, setShowConversationOptions] = useState(null);
  const [selectedMessageForDelete, setSelectedMessageForDelete] = useState(null); // ✅ Mobile tap selection
  
  // Refs
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const socketRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const attachmentMenuRef = useRef(null);
  const attachmentButtonRef = useRef(null);
  const conversationOptionRefs = useRef({});
  const reconnectTimeoutRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const lastMessageCheck = useRef(new Date());

  // ✅ ENHANCED ID normalization with null safety
  const normalizeId = useCallback((id) => {
    if (!id) return null;
    if (typeof id === 'object' && id !== null) {
      if (id._id) return String(id._id);
      if (id.$oid) return String(id.$oid);
      return String(id);
    }
    return String(id);
  }, []);

  // ✅ CRITICAL: Perfect WhatsApp-style message ownership detection - FIXED
  const isMessageOwn = useCallback((message, currentUser) => {
    if (!message || !currentUser) return false;
    
    // ✅ MULTIPLE OWNERSHIP DETECTION METHODS FOR RELIABILITY
    const messageSenderId = normalizeId(
      message.senderId?._id || 
      message.senderId?.id || 
      message.senderId || 
      message.sender?._id ||
      message.sender?.id ||
      message.sender
    );
    
    const currentUserId = normalizeId(
      currentUser._id || 
      currentUser.id || 
      currentUser
    );
    
    console.log('🔍 [isMessageOwn] Checking ownership:', {
      messageSenderId,
      currentUserId,
      messageId: message._id,
      result: messageSenderId === currentUserId
    });
    
    return messageSenderId === currentUserId;
  }, [normalizeId]);

  // ✅ FIXED AUTO-SCROLL - WORKING PERFECTLY
  const scrollToBottom = useCallback((smooth = true, force = false) => {
    if (!messagesEndRef.current || !messagesListRef.current) return;
    
    try {
      const container = messagesListRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
      
      if (force || isNearBottom) {
        // Use direct scroll for immediate effect
        container.scrollTop = container.scrollHeight;
        
        // Then smooth scroll for better UX
        if (smooth) {
          setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'end',
              inline: 'nearest'
            });
          }, 50);
        }
      }
    } catch (error) {
      console.warn('Auto-scroll failed:', error);
    }
  }, []);

  // ✅ CRITICAL FIX: PERFECT DELETE BUTTON HANDLERS - DESKTOP HOVER + MOBILE TAP
  const handleMessageInteraction = useCallback((messageId, event) => {
    // ✅ Prevent default text selection on mobile
    if (event?.type === 'touchstart') {
      event.preventDefault();
      event.stopPropagation();
    }
    
    // ✅ Handle multi-touch (likely scrolling)
    if (event?.type === 'touchstart' && event.touches && event.touches.length > 1) {
      return;
    }

    // ✅ Only handle tap on mobile/tablet - desktop uses CSS hover
    if (isMobile || isTablet) {
      console.log('📱 [handleMessageInteraction] Mobile/Tablet tap for message:', messageId);
      
      // ✅ INSTANT: Toggle delete button on tap
      if (selectedMessageForDelete === messageId) {
        setSelectedMessageForDelete(null);
        console.log('🫥 [handleMessageInteraction] Hiding delete button');
      } else {
        setSelectedMessageForDelete(messageId);
        console.log('🗑️ [handleMessageInteraction] Showing delete button INSTANTLY');
        
        // ✅ Haptic feedback for better UX
        if ('vibrate' in navigator) {
          navigator.vibrate(30);
        }
      }
    }
    // ✅ Desktop hover is handled by CSS :hover
  }, [isMobile, isTablet, selectedMessageForDelete]);

  // ✅ HIDE DELETE BUTTONS WHEN CLICKING ELSEWHERE
  const hideDeleteActions = useCallback(() => {
    if (selectedMessageForDelete) {
      console.log('🫥 [hideDeleteActions] Hiding delete actions');
      setSelectedMessageForDelete(null);
    }
  }, [selectedMessageForDelete]);

  // ✅ PERFECT responsive detection matching CSS breakpoints
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      const mobile = width <= 768;
      const tablet = width > 768 && width <= 1024;
      const desktop = width > 1024;
      
      setIsMobile(mobile);
      setIsTablet(tablet);
      
      // ✅ CRITICAL: Perfect sidebar logic matching CSS
      if (desktop) {
        setShowSidebar(true);
      } else if (mobile || tablet) {
        setShowSidebar(!activeConversation);
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => window.removeEventListener('resize', handleResize);
  }, [activeConversation]);

  // ✅ ENHANCED AUTO-SCROLL when messages update
  useEffect(() => {
    if (messages.length > 0) {
      // Immediate scroll for new messages
      scrollToBottom(false, true);
      // Follow up with smooth scroll
      setTimeout(() => scrollToBottom(true, false), 100);
    }
  }, [messages.length, scrollToBottom]);

  // ✅ CRITICAL FIX: Enhanced click outside handler for menus AND delete actions
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle attachment menu
      if (showAttachMenu && 
          attachmentMenuRef.current && 
          attachmentButtonRef.current &&
          !attachmentMenuRef.current.contains(event.target) &&
          !attachmentButtonRef.current.contains(event.target)) {
        setShowAttachMenu(false);
      }

      // Handle conversation options menu
      if (showConversationOptions) {
        const currentMenuRef = conversationOptionRefs.current[showConversationOptions];
        const optionsButton = document.querySelector(`[data-conversation-id="${showConversationOptions}"]`);
        
        if (currentMenuRef && 
            !currentMenuRef.contains(event.target) && 
            (!optionsButton || !optionsButton.contains(event.target))) {
          setShowConversationOptions(null);
        }
      }

      // ✅ CRITICAL FIX: Hide delete actions when clicking elsewhere (but not on message actions)
      if (selectedMessageForDelete && 
          !event.target.closest('.message-actions') && 
          !event.target.closest('.delete-message-btn') &&
          !event.target.closest('.message-content')) {
        hideDeleteActions();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside, { passive: false });
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showAttachMenu, showConversationOptions, selectedMessageForDelete, hideDeleteActions]);

  // ✅ PERFECT conversation selection matching CSS behavior
  const handleConversationSelect = useCallback(async (conversation) => {
    console.log('🔄 [handleConversationSelect] Selecting conversation:', conversation._id);
    
    try {
      setActiveConversation(conversation);
      
      // ✅ CRITICAL: Hide sidebar on mobile/tablet when conversation selected
      if (isMobile || isTablet) {
        setShowSidebar(false);
      }
      
      setConversations(prev => 
        prev.map(conv => ({ 
          ...conv, 
          isActive: conv._id === conversation._id 
        }))
      );
      
      setSearchTerm('');
      await fetchMessages(conversation._id);
      
      if (socketRef.current && isConnected) {
        socketRef.current.emit('join-conversation', conversation._id);
      }
      
      console.log('✅ [handleConversationSelect] Conversation selected successfully');
    } catch (error) {
      console.error('❌ [handleConversationSelect] Error:', error);
    }
  }, [isMobile, isTablet, isConnected]);

  // ✅ PERFECT back navigation matching CSS responsive behavior
  const handleBackToConversations = useCallback(() => {
    console.log('🔙 [handleBackToConversations] Navigating back');
    
    if (isMobile || isTablet) {
      setShowSidebar(true);
      setActiveConversation(null);
      setMessages([]);
      setConversations(prev => prev.map(conv => ({ ...conv, isActive: false })));
      
      if (socketRef.current && activeConversation) {
        socketRef.current.emit('leave-conversation', activeConversation._id);
      }
    } else {
      navigate(-1);
    }
  }, [isMobile, isTablet, navigate, activeConversation]);

  // ✅ PERFECT CSS class generation matching CSS structure
  const sidebarClasses = useMemo(() => {
    const classes = ['conversations-sidebar'];
    
    if (isMobile || isTablet) {
      classes.push(showSidebar && !activeConversation ? 'sidebar-visible' : 'sidebar-hidden');
    } else {
      classes.push('sidebar-visible');
    }
    
    return classes.join(' ');
  }, [isMobile, isTablet, showSidebar, activeConversation]);

  const chatAreaClasses = useMemo(() => {
    const classes = ['chat-area'];
    
    if (isMobile || isTablet) {
      classes.push(activeConversation && !showSidebar ? 'chat-visible' : 'chat-hidden');
    } else {
      classes.push('chat-visible');
    }
    
    return classes.join(' ');
  }, [isMobile, isTablet, activeConversation, showSidebar]);

  // ✅ ENHANCED polling mode for when Socket.IO fails
  const startPollingMode = useCallback(() => {
    if (pollingIntervalRef.current) return;
    
    console.log('🔄 [Polling] Starting polling mode for message updates');
    
    pollingIntervalRef.current = setInterval(async () => {
      if (activeConversation) {
        try {
          const response = await apiHelpers.getMessages(activeConversation._id);
          if (response.success && response.messages) {
            const newMessages = response.messages.filter(msg => 
              new Date(msg.createdAt) > lastMessageCheck.current
            );
            
            if (newMessages.length > 0) {
              console.log('📨 [Polling] Found', newMessages.length, 'new messages');
              setMessages(prev => {
                const combined = [...prev];
                newMessages.forEach(newMsg => {
                  if (!combined.some(existing => normalizeId(existing._id) === normalizeId(newMsg._id))) {
                    combined.push(newMsg);
                  }
                });
                return combined.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
              });
              
              lastMessageCheck.current = new Date();
              // ✅ IMMEDIATE auto-scroll for new messages
              setTimeout(() => scrollToBottom(true, true), 200);
            }
          }
        } catch (error) {
          console.error('❌ [Polling] Error:', error);
        }
      }
    }, 3000);
  }, [activeConversation, scrollToBottom, normalizeId]);

  const stopPollingMode = useCallback(() => {
    if (pollingIntervalRef.current) {
      console.log('⏹️ [Polling] Stopping polling mode');
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  // ✅ ENHANCED SOCKET.IO CONNECTION WITH ONLINE STATUS
  useEffect(() => {
    if (!isAuthenticated || !user) {
      console.log('❌ [Socket] No authentication');
      return;
    }

    if (!socketHelpers.canConnectSocket()) {
      console.error('❌ [Socket] Cannot establish connection');
      setError('Authentication required');
      return;
    }

    const serverUrl = process.env.NODE_ENV === 'production' 
      ? window.location.origin 
      : 'http://10.25.40.157:5000';
    
    const token = socketHelpers.getSocketToken();
    
    console.log('🔌 [Socket] Initializing connection to:', serverUrl);

    socketRef.current = io(serverUrl, {
      auth: { 
        token: token,
        userId: normalizeId(user._id || user.id) 
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000
    });

    const socket = socketRef.current;

    // ✅ CONNECTION EVENTS
    socket.on('connect', () => {
      console.log('✅ [Socket] Connected with ID:', socket.id);
      setIsConnected(true);
      setError(null);
      
      stopPollingMode();
      
      socket.emit('join-user-room', normalizeId(user._id || user.id));
      
      if (activeConversation) {
        socket.emit('join-conversation', activeConversation._id);
      }
      
      // ✅ Get online users for WhatsApp-style status
      socket.emit('get-online-users');
    });

    socket.on('disconnect', (reason) => {
      console.log('❌ [Socket] Disconnected:', reason);
      setIsConnected(false);
      startPollingMode();
    });

    socket.on('connect_error', (error) => {
      console.error('❌ [Socket] Connection error:', error.message);
      setIsConnected(false);
      startPollingMode();
    });

    // ✅ ENHANCED: NEW MESSAGE EVENT WITH WHATSAPP-STYLE HANDLING + AUTO-SCROLL
    socket.on('new-message', (messageData) => {
      console.log('📨 [Socket] New message received:', messageData);
      
      try {
        if (activeConversation && messageData.conversationId === activeConversation._id) {
          setMessages(prevMessages => {
            const messageExists = prevMessages.some(msg => 
              normalizeId(msg._id) === normalizeId(messageData.message._id)
            );
            if (messageExists) return prevMessages;
            
            const processedMessage = {
              ...messageData.message,
              senderId: messageData.sender || messageData.message.senderId,
              receiverId: messageData.message.receiverId
            };
            
            const newMessages = [...prevMessages, processedMessage];
            
            // ✅ CRITICAL: Immediate auto-scroll for real-time messages
            setTimeout(() => scrollToBottom(true, true), 100);
            
            return newMessages;
          });
          
          const senderId = normalizeId(messageData.sender?._id || messageData.message.senderId?._id);
          const currentUserId = normalizeId(user._id || user.id);
          
          if (senderId !== currentUserId && activeConversation) {
            setTimeout(() => {
              apiHelpers.markMessagesAsRead(activeConversation._id);
            }, 1000);
          }
        }
        
        setConversations(prevConversations => 
          prevConversations.map(conv => {
            if (conv._id === messageData.conversationId) {
              return {
                ...conv,
                lastMessage: {
                  content: messageData.message.content?.text || messageData.message.content,
                  timestamp: messageData.message.createdAt,
                  senderId: messageData.message.senderId,
                  messageType: messageData.message.messageType
                },
                updatedAt: messageData.message.createdAt
              };
            }
            return conv;
          })
        );
        
      } catch (error) {
        console.error('❌ [Socket] Error processing message:', error);
      }
    });

    // ✅ WHATSAPP-STYLE ONLINE USERS HANDLING
    socket.on('online-users', (users) => {
      console.log('👥 [Socket] Online users received:', users.length);
      const userIds = new Set(users.map(u => u.userId));
      setOnlineUsers(userIds);
    });

    socket.on('user-status-updated', ({ userId, status, lastActivity }) => {
      console.log('🔄 [Socket] User status updated:', userId, status);
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (status === 'online') {
          newSet.add(userId);
        } else {
          newSet.delete(userId);
        }
        return newSet;
      });
    });

    // ✅ WHATSAPP-STYLE MESSAGE DELIVERY STATUS - SINGLE/DOUBLE TICKS
    socket.on('message-delivered', (data) => {
      console.log('📬 [Socket] Message delivered:', data);
      setMessageDeliveryStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.messageId, { ...data, status: 'delivered' });
        return newMap;
      });
    });

    socket.on('message-read', (data) => {
      console.log('👁️ [Socket] Message read:', data);
      setMessageDeliveryStatus(prev => {
        const newMap = new Map(prev);
        newMap.set(data.messageId, { ...data, status: 'read' });
        return newMap;
      });
    });

    // ✅ WHATSAPP-STYLE TYPING INDICATORS
    socket.on('user-typing', ({ conversationId, userName, userId }) => {
      console.log('⌨️ [Socket] User typing:', userName);
      
      if (activeConversation && conversationId === activeConversation._id) {
        const currentUserId = normalizeId(user._id || user.id);
        if (normalizeId(userId) !== currentUserId) {
          setTyping(true);
          setTypingUsers(prev => new Set([...prev, userId]));
          
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          
          typingTimeoutRef.current = setTimeout(() => {
            setTyping(false);
            setTypingUsers(prev => {
              const newSet = new Set(prev);
              newSet.delete(userId);
              return newSet;
            });
          }, 3000);
        }
      }
    });

    socket.on('user-stopped-typing', ({ conversationId, userId }) => {
      console.log('⌨️ [Socket] User stopped typing');
      
      if (activeConversation && conversationId === activeConversation._id) {
        setTyping(false);
        setTypingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    });

    socket.on('connected', (data) => {
      console.log('✅ [Socket] Connection confirmed:', data);
    });

    socket.on('error', (error) => {
      console.error('❌ [Socket] Server error:', error);
    });

    // ✅ CLEANUP
    return () => {
      console.log('🧹 [Socket] Cleaning up connection');
      
      stopPollingMode();
      
      if (socket) {
        if (activeConversation) {
          socket.emit('leave-conversation', activeConversation._id);
        }
        socket.emit('leave-user-room', normalizeId(user._id || user.id));
        
        socket.removeAllListeners();
        socket.disconnect();
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [isAuthenticated, user, activeConversation, normalizeId, scrollToBottom, startPollingMode, stopPollingMode]);

  // Start polling when needed
  useEffect(() => {
    if (activeConversation && !isConnected) {
      startPollingMode();
    } else if (!activeConversation || isConnected) {
      stopPollingMode();
    }
    
    return () => {
      stopPollingMode();
    };
  }, [activeConversation, isConnected, startPollingMode, stopPollingMode]);

  // ✅ INITIALIZE COMPONENT
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    console.log('🚀 [Messages] Initializing component');
    fetchConversations();
    
    const applicationId = searchParams.get('application');
    const freelancerId = searchParams.get('freelancer');
    const jobId = searchParams.get('job');
    
    if (applicationId || freelancerId || jobId) {
      initializeConversationFromApplication(applicationId, freelancerId, jobId);
    }
  }, [isAuthenticated, searchParams, navigate]);

  // ✅ API FUNCTIONS
  const fetchConversations = async () => {
    try {
      console.log('📋 [fetchConversations] Loading conversations...');
      setLoading(true);
      setError(null);
      
      const response = await apiHelpers.getConversations({ type: filterType });
      
      if (response.success) {
        console.log('✅ [fetchConversations] Loaded', response.conversations?.length || 0, 'conversations');
        setConversations(response.conversations || []);
      } else {
        throw new Error(response.message || 'Failed to fetch conversations');
      }
    } catch (error) {
      console.error('❌ [fetchConversations] Error:', error);
      const errorInfo = handleApiError(error);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeConversationFromApplication = async (applicationId, freelancerId, jobId) => {
    try {
      console.log('🔄 [initializeConversationFromApplication] Creating conversation...', {
        applicationId, freelancerId, jobId
      });

      const conversationData = {
        participantId: freelancerId || user._id,
        type: 'project'
      };

      if (applicationId) conversationData.applicationId = applicationId;
      if (jobId) conversationData.jobId = jobId;

      const response = await apiHelpers.createOrFindConversation(conversationData);
      
      if (response.success) {
        const conversation = response.conversation;
        console.log('✅ [initializeConversationFromApplication] Conversation ready:', conversation._id);
        
        await handleConversationSelect(conversation);
        
        setConversations(prev => {
          const exists = prev.find(conv => conv._id === conversation._id);
          if (!exists) {
            return [conversation, ...prev];
          }
          return prev;
        });
      } else {
        throw new Error(response.message || 'Failed to create conversation');
      }
    } catch (error) {
      console.error('❌ [initializeConversationFromApplication] Error:', error);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      console.log('💬 [fetchMessages] Loading messages for:', conversationId);
      
      const response = await apiHelpers.getMessages(conversationId);
      
      if (response.success) {
        console.log('✅ [fetchMessages] Loaded', response.messages?.length || 0, 'messages');
        setMessages(response.messages || []);
        
        try {
          await apiHelpers.markMessagesAsRead(conversationId);
        } catch (readError) {
          console.warn('⚠️ [fetchMessages] Failed to mark as read:', readError);
        }
        
        // ✅ IMMEDIATE auto-scroll after loading messages
        setTimeout(() => scrollToBottom(false, true), 150);
        lastMessageCheck.current = new Date();
        
      } else {
        throw new Error(response.message || 'Failed to fetch messages');
      }
    } catch (error) {
      console.error('❌ [fetchMessages] Error:', error);
      setMessages([]);
    }
  };

  // ✅ ENHANCED MESSAGE SENDING WITH WHATSAPP-STYLE BEHAVIOR + AUTO-SCROLL
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeConversation || sendingMessage) return;
    
    console.log('📤 [sendMessage] Sending message...');
    setSendingMessage(true);
    const messageText = newMessage.trim();
    setNewMessage('');
    
    const normalizedUserId = normalizeId(user._id || user.id);
    const tempMessageId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const tempMessage = {
      _id: tempMessageId,
      conversationId: activeConversation._id,
      senderId: { _id: normalizedUserId, name: user.name },
      receiverId: activeConversation.otherUser?._id,
      content: { text: messageText },
      messageType: 'text',
      createdAt: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    // ✅ IMMEDIATE auto-scroll for sent messages
    setTimeout(() => scrollToBottom(true, true), 50);
    
    try {
      const messageData = {
        receiverId: activeConversation.otherUser?._id,
        content: messageText,
        messageType: 'text',
        conversationId: activeConversation._id,
        metadata: {}
      };
      
      const response = await apiHelpers.sendMessage(messageData);
      
      if (response.success) {
        console.log('✅ [sendMessage] Message sent successfully');
        
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempMessageId 
              ? { ...response.message, status: 'sent' }
              : msg
          )
        );
        
        if (socketRef.current && isConnected) {
          console.log('📤 [Socket] Broadcasting message');
          socketRef.current.emit('send-message', {
            conversationId: activeConversation._id,
            message: response.message,
            receiverId: activeConversation.otherUser?._id
          });
          
          socketRef.current.emit('stop-typing', {
            conversationId: activeConversation._id
          });
        } else {
          lastMessageCheck.current = new Date();
        }
        
        setConversations(prev => prev.map(conv => 
          conv._id === activeConversation._id 
            ? { 
                ...conv, 
                lastMessage: {
                  content: messageText,
                  timestamp: new Date().toISOString(),
                  senderId: normalizedUserId,
                  messageType: 'text'
                },
                updatedAt: new Date().toISOString()
              }
            : conv
        ));
        
        // ✅ Final auto-scroll after message sent
        setTimeout(() => scrollToBottom(true, false), 100);
        
      } else {
        throw new Error(response.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('❌ [sendMessage] Error:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
      setNewMessage(messageText);
    } finally {
      setSendingMessage(false);
    }
  };

  // ✅ ENHANCED INPUT CHANGE WITH WHATSAPP-STYLE TYPING
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (socketRef.current && activeConversation && value.trim() && isConnected) {
      socketRef.current.emit('typing', {
        conversationId: activeConversation._id,
        userName: user.name,
        userId: normalizeId(user._id || user.id)
      });
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      typingTimeoutRef.current = setTimeout(() => {
        if (socketRef.current && isConnected) {
          socketRef.current.emit('stop-typing', {
            conversationId: activeConversation._id,
            userId: normalizeId(user._id || user.id)
          });
        }
      }, 1000);
    }
  };

  // ✅ CRITICAL FIX: ENHANCED FILE UPLOAD HANDLER WITH PERFECT IMAGE HANDLING
  const handleFileUpload = async (file, fileType) => {
    if (!activeConversation || !file) return;
    
    console.log('📎 [handleFileUpload] Uploading file:', file.name, fileType);
    setUploadingFile(true);
    setShowAttachMenu(false);
    
    const tempMessageId = `temp-file-${Date.now()}`;
    
    // Create temporary message for upload progress
    const tempMessage = {
      _id: tempMessageId,
      conversationId: activeConversation._id,
      senderId: { _id: normalizeId(user._id || user.id), name: user.name },
      receiverId: activeConversation.otherUser?._id,
      content: { 
        file: { 
          originalName: file.name,
          size: file.size 
        } 
      },
      messageType: fileType,
      createdAt: new Date().toISOString(),
      status: 'uploading'
    };
    
    setMessages(prev => [...prev, tempMessage]);
    setTimeout(() => scrollToBottom(true, true), 50);
    
    try {
      const formData = new FormData();
      formData.append('messageFile', file);
      formData.append('conversationId', activeConversation._id);
      formData.append('receiverId', activeConversation.otherUser?._id);
      formData.append('messageType', fileType);
      
      const uploadResponse = await apiHelpers.uploadMessageFile(formData);
      
      if (uploadResponse.success) {
        console.log('✅ [handleFileUpload] File uploaded successfully');
        console.log('📋 [handleFileUpload] Upload response:', uploadResponse);
        
        // ✅ CRITICAL FIX: Use the correct structure from backend response
        const fileData = uploadResponse.fileData; // Backend sends fileData, not file
        
        // ✅ CRITICAL FIX: Send message with correct file structure
        const messageData = {
          receiverId: activeConversation.otherUser?._id,
          content: {
            file: {
              filename: fileData.filename,
              originalName: fileData.originalName,
              mimetype: fileData.mimetype,
              size: fileData.size,
              url: fileData.url,
              fullUrl: fileData.fullUrl, // ✅ CRITICAL: This is the correct URL!
              isImage: fileData.isImage || fileType === 'image',
              hasPreview: fileData.hasPreview || fileType === 'image'
            }
          },
          messageType: fileType,
          conversationId: activeConversation._id,
          metadata: {
            uploadedAt: fileData.uploadedAt,
            uploadedBy: fileData.uploadedBy
          }
        };
        
        console.log('📤 [handleFileUpload] Sending message with file data:', messageData);
        
        const sendResponse = await apiHelpers.sendMessage(messageData);
        
        if (sendResponse.success) {
          console.log('✅ [handleFileUpload] Message sent successfully');
          
          // ✅ CRITICAL FIX: Replace temp message with actual message with correct structure
          setMessages(prev => 
            prev.map(msg => 
              msg._id === tempMessageId 
                ? { 
                    ...sendResponse.message, 
                    status: 'sent',
                    content: {
                      ...sendResponse.message.content,
                      file: {
                        ...sendResponse.message.content.file,
                        fullUrl: fileData.fullUrl // ✅ ENSURE fullUrl is preserved!
                      }
                    }
                  }
                : msg
            )
          );
          
          // Emit socket event for real-time update
          if (socketRef.current && isConnected) {
            socketRef.current.emit('send-message', {
              conversationId: activeConversation._id,
              message: {
                ...sendResponse.message,
                content: {
                  ...sendResponse.message.content,
                  file: {
                    ...sendResponse.message.content.file,
                    fullUrl: fileData.fullUrl
                  }
                }
              },
              receiverId: activeConversation.otherUser?._id
            });
          }
          
          setTimeout(() => scrollToBottom(true, true), 100);
        } else {
          throw new Error(sendResponse.message || 'Failed to send message');
        }
        
      } else {
        throw new Error(uploadResponse.message || 'File upload failed');
      }
    } catch (error) {
      console.error('❌ [handleFileUpload] Error:', error);
      setMessages(prev => prev.filter(msg => msg._id !== tempMessageId));
      setError(`Failed to upload ${fileType}: ${error.message}`);
    } finally {
      setUploadingFile(false);
      // Hide any selected message for delete
      setSelectedMessageForDelete(null);
    }
  };

  // ✅ WORKING DELETE MESSAGE HANDLER
  const handleDeleteMessage = async (messageId) => {
    if (!messageId || deletingMessage === messageId) return;
    
    console.log('🗑️ [handleDeleteMessage] Deleting message:', messageId);
    setDeletingMessage(messageId);
    
    try {
      // Optimistically remove from UI
      setMessages(prev => prev.filter(msg => normalizeId(msg._id) !== normalizeId(messageId)));
      
      const response = await apiHelpers.deleteMessage(messageId);
      
      if (!response.success) {
        // Revert if deletion failed
        await fetchMessages(activeConversation._id);
        throw new Error(response.message || 'Failed to delete message');
      }
      
      console.log('✅ [handleDeleteMessage] Message deleted successfully');
      
      // Emit socket event for real-time update
      if (socketRef.current && isConnected) {
        socketRef.current.emit('message-deleted', {
          messageId,
          conversationId: activeConversation._id
        });
      }
      
      // Hide delete actions after successful deletion
      setSelectedMessageForDelete(null);
      
    } catch (error) {
      console.error('❌ [handleDeleteMessage] Error:', error);
      setError('Failed to delete message');
    } finally {
      setDeletingMessage(null);
    }
  };

  // ✅ CONVERSATION OPTIONS HANDLERS
  const handleConversationOptionsClick = useCallback((e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();
    
    setShowAttachMenu(false);
    setShowConversationOptions(prev => prev === conversationId ? null : conversationId);
  }, []);

  const handleDeleteConversation = useCallback(async (e, conversationId) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (deletingConversation === conversationId) return;
    
    try {
      setDeletingConversation(conversationId);
      setShowConversationOptions(null);
      
      setConversations(prev => prev.filter(conv => conv._id !== conversationId));
      
      if (activeConversation && activeConversation._id === conversationId) {
        setActiveConversation(null);
        setMessages([]);
        if (isMobile || isTablet) {
          setShowSidebar(true);
        }
      }
      
      const response = await apiHelpers.deleteConversation(conversationId);
      
      if (!response.success) {
        fetchConversations();
        throw new Error(response.message || 'Failed to delete conversation');
      }
      
    } catch (error) {
      console.error('❌ [handleDeleteConversation] Error:', error);
      fetchConversations();
    } finally {
      setDeletingConversation(null);
    }
  }, [activeConversation, isMobile, isTablet, deletingConversation]);

  // ✅ HELPER FUNCTIONS
  const filteredConversations = useMemo(() => {
    return conversations.filter(conv => {
      const otherUser = conv.otherUser || {};
      const matchesSearch = !searchTerm || 
        otherUser.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.metadata?.jobTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        conv.title?.toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });
  }, [conversations, searchTerm]);

  const formatMessageTime = useCallback((date) => {
    if (!date) return 'Invalid Date';
    
    try {
      return utils.formatMessageTime(date);
    } catch (error) {
      console.error('❌ Date formatting error:', error);
      return 'Invalid Date';
    }
  }, []);

  // ✅ CRITICAL FIX: PERFECT MESSAGE CONTENT RENDERER WITH FIXED IMAGE DISPLAY
  const renderMessageContent = useCallback((message) => {
    try {
      console.log('🎨 [renderMessageContent] Rendering message:', {
        messageType: message.messageType,
        hasContent: !!message.content,
        hasFile: !!message.content?.file,
        fileUrl: message.content?.file?.fullUrl,
        status: message.status
      });

      switch(message.messageType) {
        case 'image':
          if (message.status === 'uploading') {
            return (
              <div className="message-image uploading">
                <div className="file-uploading">
                  <Loader className="animate-spin" size={20} />
                  <span>Uploading image...</span>
                </div>
              </div>
            );
          }
          
          // ✅ CRITICAL FIX: Perfect image URL handling
          const imageUrl = message.content?.file?.fullUrl || 
                          message.content?.file?.url || 
                          (message.content?.file?.filename ? 
                            `http://10.25.40.157:5000/uploads/messages/${message.content.file.filename}` : 
                            null);
          
          console.log('🖼️ [renderMessageContent] Image URL resolved:', imageUrl);
          
          if (!imageUrl) {
            return (
              <div className="message-image error">
                <div className="image-placeholder">
                  <ImageIcon size={24} />
                  <span>Image unavailable</span>
                </div>
              </div>
            );
          }
          
          return (
            <div className="message-image">
              <img 
                src={imageUrl}
                alt={message.content?.file?.originalName || "Shared image"}
                onClick={() => window.open(imageUrl, '_blank')}
                onLoad={() => {
                  console.log('✅ [renderMessageContent] Image loaded successfully:', imageUrl);
                }}
                onError={(e) => {
                  console.error('❌ [renderMessageContent] Image failed to load:', imageUrl);
                  e.target.style.display = 'none';
                  const errorDiv = e.target.nextSibling;
                  if (errorDiv) errorDiv.style.display = 'block';
                }}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              />
              <div className="image-error" style={{ display: 'none' }}>
                <ImageIcon size={24} />
                <span>Failed to load image</span>
              </div>
            </div>
          );
        
        case 'file':
          if (message.status === 'uploading') {
            return (
              <div className="message-file uploading">
                <div className="file-icon">
                  <Loader className="animate-spin" size={20} />
                </div>
                <div className="file-info">
                  <span className="file-name">{message.content?.file?.originalName || 'Uploading...'}</span>
                  <span className="file-size">Uploading...</span>
                </div>
              </div>
            );
          }
          
          const fileUrl = message.content?.file?.fullUrl || 
                         message.content?.file?.url ||
                         (message.content?.file?.filename ? 
                           `http://10.25.40.157:5000/uploads/messages/${message.content.file.filename}` : 
                           null);
          
          return (
            <div className="message-file">
              <div className="file-icon">
                <FileText size={20} />
              </div>
              <div className="file-info">
                <span className="file-name">{message.content?.file?.originalName || 'Document'}</span>
                <span className="file-size">
                  {message.content?.file?.size ? utils.formatFileSize(message.content.file.size) : 'Unknown size'}
                </span>
              </div>
              {fileUrl && (
                <button 
                  className="file-download"
                  onClick={() => window.open(fileUrl, '_blank')}
                  title="Download file"
                >
                  <Download size={14} />
                </button>
              )}
            </div>
          );
        
        default:
          return <p>{message.content?.text || message.content || 'Message content unavailable'}</p>;
      }
    } catch (error) {
      console.error('❌ Error rendering message content:', error);
      return <p>Error displaying message</p>;
    }
  }, []);

  const getUserRoleIcon = useCallback((role) => {
    switch(role) {
      case 'client': return <Building size={14} />;
      case 'professional': return <Briefcase size={14} />;
      case 'admin': return <Star size={14} />;
      default: return <User size={14} />;
    }
  }, []);

  const getUserRoleDisplay = useCallback((role) => {
    switch(role) {
      case 'client': return 'Client';
      case 'professional': return 'Professional';
      case 'admin': return 'Admin';
      default: return 'User';
    }
  }, []);

  // ✅ LOADING STATE
  if (loading) {
    return (
      <div className="messages-loading-container">
        <div className="messages-loading">
          <Loader className="animate-spin" size={32} />
          <h3>Loading Messages...</h3>
          <p>Setting up your professional messaging...</p>
        </div>
      </div>
    );
  }

  // ✅ ERROR STATE
  if (error && !conversations.length) {
    return (
      <div className="messages-error-container">
        <div className="messages-error">
          <AlertCircle size={48} />
          <h3>Error Loading Messages</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={fetchConversations} className="btn btn-primary">
              Try Again
            </button>
            <button onClick={() => navigate(-1)} className="btn btn-secondary">
              Go Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ✅ MAIN RENDER WITH PERFECT WHATSAPP-STYLE LAYOUT
  return (
    <div className="messages-container">
      <div className={`messages-layout ${
        isMobile ? 'mobile-layout' : 
        isTablet ? 'tablet-layout' : 
        'desktop-layout'
      }`}>
        
        {error && (
          <div className="error-banner">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={() => setError(null)}>
              <X size={16} />
            </button>
          </div>
        )}

        {/* ✅ CONVERSATIONS SIDEBAR - MATCHING CSS */}
        <div className={sidebarClasses}>
          
          <div className="sidebar-header">
            {!isMobile && !isTablet && (
              <button 
                onClick={() => navigate(-1)}
                className="back-btn desktop-only"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            {(isMobile || isTablet) && activeConversation && (
              <button 
                onClick={handleBackToConversations}
                className="back-btn mobile-back"
              >
                <ArrowLeft size={20} />
              </button>
            )}
            <h2>Messages</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
                {isConnected ? '🟢' : (pollingIntervalRef.current ? '🟡' : '🔴')}
              </span>
              <button 
                className="new-conversation-btn"
                onClick={() => navigate('/find-freelancers')}
                title="Start new conversation"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="sidebar-controls">
            <div className="search-conversations">
              <Search size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <button 
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            
            <div className="conversation-filters">
              <button 
                className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
                onClick={() => {
                  setFilterType('all');
                  fetchConversations();
                }}
              >
                All
              </button>
              <button 
                className={`filter-btn ${filterType === 'project' ? 'active' : ''}`}
                onClick={() => {
                  setFilterType('project');
                  fetchConversations();
                }}
              >
                Projects
              </button>
              <button 
                className={`filter-btn ${filterType === 'direct' ? 'active' : ''}`}
                onClick={() => {
                  setFilterType('direct');
                  fetchConversations();
                }}
              >
                Direct
              </button>
            </div>
          </div>

          <div className="conversations-list">
            {filteredConversations.length > 0 ? (
              filteredConversations.map(conversation => {
                // ✅ WHATSAPP-STYLE online status check
                const isOnline = onlineUsers.has(normalizeId(conversation.otherUser?._id));
                
                return (
                  <div 
                    key={conversation._id}
                    className={`conversation-item ${activeConversation?._id === conversation._id ? 'active' : ''}`}
                  >
                    <button 
                      className="conversation-content"
                      onClick={() => handleConversationSelect(conversation)}
                    >
                      <div className="conversation-avatar">
                        {conversation.otherUser?.avatar ? (
                          <img 
                            src={getImageUrl(conversation.otherUser.avatar, 'avatars')}
                            alt={conversation.otherUser.name}
                            onError={(e) => {
                              e.target.style.display = 'none';
                              e.target.nextSibling.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className="avatar-placeholder" style={{ display: conversation.otherUser?.avatar ? 'none' : 'flex' }}>
                          {getUserRoleIcon(conversation.otherUser?.role)}
                        </div>
                        {conversation.unreadCount > 0 && (
                          <div className="unread-badge">{conversation.unreadCount}</div>
                        )}
                      </div>

                      <div className="conversation-info">
                        <div className="conversation-header">
                          <h4>{conversation.otherUser?.name || 'Unknown User'}</h4>
                          <span className="message-time">
                            {conversation.lastMessage && formatMessageTime(conversation.lastMessage.timestamp)}
                          </span>
                        </div>
                        
                        <div className="user-role">
                          {getUserRoleIcon(conversation.otherUser?.role)}
                          <span className={`role-badge ${conversation.otherUser?.role}`}>
                            {getUserRoleDisplay(conversation.otherUser?.role)}
                          </span>
                          {/* ✅ WHATSAPP-STYLE online status display */}
                          {isOnline && (
                            <span style={{ color: '#10b981', marginLeft: '6px', fontSize: '10px' }}>
                              • Online
                            </span>
                          )}
                        </div>
                        
                        {conversation.metadata?.jobTitle && (
                          <p className="project-title">
                            <Briefcase size={10} />
                            {conversation.metadata.jobTitle}
                          </p>
                        )}
                        
                        {conversation.lastMessage && (
                          <p className="last-message">
                            {normalizeId(conversation.lastMessage.senderId) === normalizeId(user._id || user.id) ? 'You: ' : ''}
                            {conversation.lastMessage.messageType === 'text' 
                              ? (conversation.lastMessage.content?.substring(0, 40) || '')
                              : `📎 ${conversation.lastMessage.messageType}`
                            }
                            {(conversation.lastMessage.content?.length > 40) && '...'}
                          </p>
                        )}
                      </div>
                    </button>

                    <div className="conversation-actions">
                      <button 
                        className="conversation-options-btn"
                        data-conversation-id={conversation._id}
                        onClick={(e) => handleConversationOptionsClick(e, conversation._id)}
                        title="More options"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      
                      {showConversationOptions === conversation._id && (
                        <div 
                          ref={(el) => {
                            conversationOptionRefs.current[conversation._id] = el;
                          }}
                          className="conversation-options-menu show"
                        >
                          <button
                            onClick={(e) => handleDeleteConversation(e, conversation._id)}
                            disabled={deletingConversation === conversation._id}
                            className="delete-option"
                          >
                            {deletingConversation === conversation._id ? (
                              <>
                                <Loader className="animate-spin" size={12} />
                                Deleting...
                              </>
                            ) : (
                              <>
                                <Trash2 size={12} />
                                Delete
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-conversations">
                <MessageSquare size={40} />
                <h3>No Conversations</h3>
                <p>Start a conversation from a job application or find professionals to connect with.</p>
                <div className="empty-actions">
                  <button 
                    className="btn btn-primary"
                    onClick={() => navigate('/find-freelancers')}
                  >
                    Find Professionals
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ CHAT AREA - PERFECT WHATSAPP STYLE WITHOUT CALL/VIDEO ICONS */}
        <div className={chatAreaClasses}>
          {activeConversation ? (
            <>
              {/* ✅ SIMPLIFIED CHAT HEADER - NO CALL/VIDEO ICONS */}
              <div className="chat-header">
                <div className="chat-user-info">
                  <div className="user-avatar">
                    {activeConversation.otherUser?.avatar ? (
                      <img 
                        src={getImageUrl(activeConversation.otherUser.avatar, 'avatars')}
                        alt={activeConversation.otherUser.name}
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.nextSibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div className="avatar-placeholder" style={{ display: activeConversation.otherUser?.avatar ? 'none' : 'flex' }}>
                      {getUserRoleIcon(activeConversation.otherUser?.role)}
                    </div>
                    {/* ✅ WHATSAPP-STYLE animated online status */}
                    <div className={`online-status ${
                      onlineUsers.has(normalizeId(activeConversation.otherUser?._id)) ? 'online' : 'offline'
                    }`}></div>
                  </div>
                  
                  <div className="user-details">
                    <h3>{activeConversation.otherUser?.name || 'Unknown User'}</h3>
                    <div className="user-meta">
                      <span className={`user-role-badge ${activeConversation.otherUser?.role}`}>
                        {getUserRoleIcon(activeConversation.otherUser?.role)}
                        <span className="role-text">
                          {getUserRoleDisplay(activeConversation.otherUser?.role)}
                        </span>
                      </span>
                      {/* ✅ WHATSAPP-STYLE online status text */}
                      {onlineUsers.has(normalizeId(activeConversation.otherUser?._id)) && (
                        <>
                          <span className="separator">•</span>
                          <span style={{ color: '#10b981' }}>Online</span>
                        </>
                      )}
                      {activeConversation.metadata?.jobTitle && (
                        <>
                          <span className="separator">•</span>
                          <span className="project-context">
                            <Briefcase size={12} />
                            {activeConversation.metadata.jobTitle}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ✅ SIMPLIFIED CHAT ACTIONS - ONLY BACK & OPTIONS */}
                <div className="chat-actions">
                  {(isMobile || isTablet) && (
                    <button 
                      onClick={handleBackToConversations}
                      className="action-btn"
                      title="Back to conversations"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  )}
                  <button className="action-btn" title="More Options">
                    <MoreHorizontal size={18} />
                  </button>
                </div>
              </div>

              <div className="messages-container-inner">
                <div ref={messagesListRef} className="messages-list">
                  {messages.length > 0 ? (
                    messages.map((message, index) => {
                      const isOwnMessage = isMessageOwn(message, user);
                      const deliveryStatus = messageDeliveryStatus.get(normalizeId(message._id));
                      const messageId = normalizeId(message._id);
                      
                      console.log('🎯 [Message Render] Message:', messageId, 'isOwnMessage:', isOwnMessage, 'senderId:', message.senderId);
                      
                      return (
                        <div 
                          key={message._id || index}
                          className={`message ${isOwnMessage ? 'sent' : 'received'} ${
                            message.status === 'sending' || message.status === 'uploading' ? 'sending' : ''
                          } ${
                            selectedMessageForDelete === messageId ? 'show-actions' : ''
                          }`}
                          onClick={(e) => handleMessageInteraction(messageId, e)}
                          onTouchStart={(e) => handleMessageInteraction(messageId, e)}
                        >
                          {/* ✅ WHATSAPP-STYLE: Show sender name ONLY for received messages */}
                          {!isOwnMessage && (
                            <div className="message-sender-info">
                              <span className="sender-name">
                                {message.senderId?.name || activeConversation.otherUser?.name || 'Unknown'}
                              </span>
                            </div>
                          )}
                          
                          <div className="message-content">
                            {renderMessageContent(message)}
                            <div className="message-meta">
                              <span className="message-time">
                                {formatMessageTime(message.createdAt || message.timestamp)}
                              </span>
                              {/* ✅ PERFECT WHATSAPP-STYLE SINGLE/DOUBLE TICKS */}
                              {isOwnMessage && (
                                <div className="message-status">
                                  {message.status === 'sending' || message.status === 'uploading' ? (
                                    <Clock size={12} className="sending" />
                                  ) : deliveryStatus?.status === 'read' ? (
                                    <CheckCheck size={12} className="read" />
                                  ) : deliveryStatus?.status === 'delivered' ? (
                                    <CheckCheck size={12} className="delivered" />
                                  ) : (
                                    <Check size={12} className="sent" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {/* ✅ CRITICAL FIX: PERFECT DELETE BUTTON - DESKTOP HOVER + MOBILE TAP */}
                          <div className="message-actions">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteMessage(message._id);
                              }}
                              disabled={deletingMessage === messageId}
                              className="delete-message-btn"
                              title="Delete message"
                            >
                              {deletingMessage === messageId ? (
                                <Loader className="animate-spin" size={10} />
                              ) : (
                                <Trash2 size={10} />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="no-messages">
                      <MessageSquare size={40} />
                      <h4>Start Your Conversation</h4>
                      <p>Send a message to begin your professional discussion.</p>
                    </div>
                  )}
                  
                  {/* ✅ WHATSAPP-STYLE typing indicator with bubble and tail */}
                  {typing && typingUsers.size > 0 && (
                    <div className="typing-indicator-whatsapp">
                      <div className="typing-bubble">
                        <div className="typing-dots-whatsapp">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* ✅ WHATSAPP-STYLE input area WITH WORKING ATTACHMENT MENU */}
              <form onSubmit={sendMessage} className="message-input-form">
                <div className="message-input-container">
                  <div className="input-actions" ref={attachmentButtonRef}>
                    <button 
                      type="button" 
                      className="attachment-btn"
                      onClick={(e) => {
                        e.preventDefault();
                        setShowAttachMenu(!showAttachMenu);
                      }}
                      disabled={uploadingFile}
                      title="Attach file"
                    >
                      {uploadingFile ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <Paperclip size={16} />
                      )}
                    </button>
                    
                    {/* ✅ WORKING ATTACHMENT MENU */}
                    {showAttachMenu && (
                      <div ref={attachmentMenuRef} className="attachment-menu">
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = (e) => {
                              const file = e.target.files[0];
                              if (file) handleFileUpload(file, 'image');
                            };
                            input.click();
                          }}
                          disabled={uploadingFile}
                        >
                          <ImageIcon size={14} />
                          Image
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.doc,.docx,.txt,.zip,.rar';
                            input.onchange = (e) => {
                              const file = e.target.files[0];
                              if (file) handleFileUpload(file, 'file');
                            };
                            input.click();
                          }}
                          disabled={uploadingFile}
                        >
                          <FileText size={14} />
                          Document
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <input
                    ref={messageInputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    placeholder={isConnected ? "Type a message..." : pollingIntervalRef.current ? "Polling mode..." : "Connecting..."}
                    disabled={sendingMessage || uploadingFile}
                    className="message-input"
                    autoComplete="off"
                  />
                  
                  <div className="send-button-wrapper">
                    <button 
                      type="submit" 
                      className="send-btn"
                      disabled={!newMessage.trim() || sendingMessage || uploadingFile}
                      title="Send message"
                    >
                      {sendingMessage ? (
                        <Loader className="animate-spin" size={16} />
                      ) : (
                        <Send size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="no-conversation-selected">
              <MessageSquare size={56} />
              <h3>Select a Conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging with professionals and clients.</p>
              <div className="quick-actions">
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate('/find-freelancers')}
                >
                  <User size={14} />
                  Find Professionals
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* ✅ HIDDEN FILE INPUT FOR COMPATIBILITY */}
      <input
        ref={fileInputRef}
        type="file"
        className="hidden-file-input"
        accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
        onChange={(e) => {
          const file = e.target.files[0];
          if (file) {
            const isImage = file.type.startsWith('image/');
            handleFileUpload(file, isImage ? 'image' : 'file');
          }
        }}
      />
    </div>
  );
};

export default Messages;