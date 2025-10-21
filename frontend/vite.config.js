import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    // This makes process.env available (alternative approach)
    global: 'globalThis',
  },
  server: {
    // ✅ MOBILE COMPATIBLE: Allow external connections from any IP address
    host: '0.0.0.0', // Critical for mobile access - allows connections from network devices
    port: 5173,
    strictPort: true, // Don't try other ports if 5173 is occupied
    
    // ✅ MOBILE COMPATIBLE: Enhanced proxy configuration for mobile/network access
    proxy: {
      // ============================================
      // API ENDPOINTS PROXY
      // ============================================
      '/api': {
        target: 'http://localhost:5000', // Your backend server
        changeOrigin: true, // Critical for mobile compatibility
        secure: false, // Allow HTTP connections in development
        rewrite: (path) => path, // Keep the path as-is
        configure: (proxy, options) => {
          // Enhanced logging for debugging mobile issues
          proxy.on('error', (err, req, res) => {
            console.error('❌ [PROXY ERROR] API proxy failed:', err.message);
            console.error('❌ [PROXY ERROR] Request details:', {
              url: req.url,
              method: req.method,
              headers: req.headers,
              target: options.target
            });
          });
          
          proxy.on('proxyReq', (proxyReq, req, res) => {
            const isMobile = req.headers['user-agent']?.toLowerCase().includes('mobile');
            console.log(`🔄 [PROXY] ${req.method} ${req.url} -> ${options.target}${req.url}`);
            
            if (isMobile) {
              console.log('📱 [PROXY] Mobile request detected:', {
                userAgent: req.headers['user-agent'],
                referer: req.headers['referer'],
                host: req.headers['host']
              });
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, res) => {
            const isMobile = req.headers['user-agent']?.toLowerCase().includes('mobile');
            console.log(`✅ [PROXY] Response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
            
            if (isMobile && proxyRes.statusCode >= 400) {
              console.error('❌ [PROXY] Mobile request failed:', {
                status: proxyRes.statusCode,
                statusMessage: proxyRes.statusMessage,
                url: req.url,
                method: req.method
              });
            }
          });
        }
      },

      // ============================================
      // MEDIA/UPLOADS PROXY - CRITICAL FOR MOBILE IMAGES/VIDEOS
      // ============================================
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true, // Critical for mobile compatibility
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [MEDIA PROXY ERROR]:', err.message);
            console.error('❌ [MEDIA PROXY ERROR] Request:', {
              url: req.url,
              method: req.method,
              target: options.target
            });
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            const isMobile = req.headers['user-agent']?.toLowerCase().includes('mobile');
            const isVideo = req.url.includes('.mp4') || req.url.includes('.webm') || req.url.includes('.mov');
            const isImage = req.url.includes('.jpg') || req.url.includes('.jpeg') || req.url.includes('.png') || req.url.includes('.gif') || req.url.includes('.webp');
            
            console.log(`🖼️ [MEDIA PROXY] ${req.method} ${req.url} -> ${options.target}${req.url}`);
            
            if (isMobile) {
              console.log('📱 [MEDIA PROXY] Mobile media request:', {
                type: isVideo ? 'VIDEO' : isImage ? 'IMAGE' : 'OTHER',
                url: req.url,
                userAgent: req.headers['user-agent']?.substring(0, 50) + '...'
              });
            }
            
            // Add headers for better mobile compatibility
            proxyReq.setHeader('Cache-Control', 'public, max-age=31536000');
            if (isVideo) {
              proxyReq.setHeader('Accept-Ranges', 'bytes');
            }
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            const isMobile = req.headers['user-agent']?.toLowerCase().includes('mobile');
            const isVideo = req.url.includes('.mp4') || req.url.includes('.webm') || req.url.includes('.mov');
            
            console.log(`✅ [MEDIA PROXY] Response: ${proxyRes.statusCode} for ${req.url}`);
            
            if (isMobile && proxyRes.statusCode >= 400) {
              console.error('❌ [MEDIA PROXY] Mobile media request failed:', {
                status: proxyRes.statusCode,
                url: req.url,
                type: isVideo ? 'VIDEO' : 'MEDIA'
              });
            }
            
            // Enhanced headers for mobile compatibility
            if (proxyRes.statusCode === 200) {
              // Set proper CORS headers for mobile
              res.setHeader('Access-Control-Allow-Origin', '*');
              res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
              res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
              
              // Set proper caching headers
              res.setHeader('Cache-Control', 'public, max-age=31536000');
              
              // For videos, set proper range support for mobile
              if (isVideo) {
                res.setHeader('Accept-Ranges', 'bytes');
                if (proxyRes.headers['content-range']) {
                  res.setHeader('Content-Range', proxyRes.headers['content-range']);
                }
              }
            }
          });
        }
      },

      // ============================================
      // SOCKET.IO PROXY FOR REAL-TIME MESSAGING
      // ============================================
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true, // Critical for mobile compatibility
        ws: true, // Enable WebSocket proxying
        secure: false,
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.error('❌ [SOCKET PROXY ERROR]:', err.message);
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            const isMobile = req.headers['user-agent']?.toLowerCase().includes('mobile');
            console.log(`🔌 [SOCKET PROXY] ${req.method} ${req.url}`);
            
            if (isMobile) {
              console.log('📱 [SOCKET PROXY] Mobile socket connection');
            }
          });
        }
      }
    },

    // ✅ MOBILE COMPATIBLE: Enhanced CORS configuration
    cors: {
      origin: true, // Allow all origins in development (critical for mobile testing)
      credentials: true, // Allow credentials (cookies, auth headers)
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
      exposedHeaders: ['Content-Range', 'X-Content-Range']
    },

    // ✅ MOBILE OPTIMIZED: Additional server options
    hmr: {
      // Hot Module Replacement configuration for network access
      host: '0.0.0.0', // Allow HMR from any network device
      port: 5173
    },

    // ✅ MOBILE COMPATIBLE: Headers for better mobile support
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin',
      'Access-Control-Allow-Credentials': 'true'
    }
  },

  // ✅ MOBILE OPTIMIZED: Build configuration
  build: {
    // Target modern browsers but include mobile compatibility
    target: ['es2015', 'chrome58', 'firefox57', 'safari11', 'edge16'],
    
    // Optimize for mobile networks
    rollupOptions: {
      output: {
        // Split chunks for better mobile loading
        manualChunks: {
          vendor: ['react', 'react-dom', 'axios'],
          utils: ['lucide-react']
        }
      }
    },
    
    // Smaller chunk size limit for mobile
    chunkSizeWarningLimit: 1000,
    
    // Source maps for debugging mobile issues
    sourcemap: true
  },

  // ✅ MOBILE COMPATIBLE: Preview server configuration (for production preview)
  preview: {
    host: '0.0.0.0', // Allow external connections for mobile testing
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000'
    }
  },

  // ✅ MOBILE OPTIMIZED: CSS configuration
  css: {
    // PostCSS configuration for better mobile support
    postcss: {
      plugins: []
    }
  },

  // ✅ MOBILE COMPATIBLE: Environment variables
  envPrefix: ['VITE_', 'NODE_ENV']
})
