import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  
  // ✅ PRODUCTION BUILD CONFIGURATION
  build: {
    // Modern target for production
    target: ['es2015', 'chrome58', 'firefox57', 'safari11', 'edge16'],
    
    // Optimize for production
    minify: 'terser',
    sourcemap: false, // Disable source maps for production (faster builds)
    
    // Optimize chunk splitting for better loading
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React libraries
          react: ['react', 'react-dom'],
          // UI libraries  
          ui: ['react-bootstrap', '@popperjs/core', 'bootstrap'],
          // Utility libraries
          utils: ['axios', 'lucide-react', 'react-icons'],
          // Router
          router: ['react-router-dom'],
          // Socket.IO
          socket: ['socket.io-client']
        },
        // Optimize file names for caching
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 1000,
    
    // Output directory
    outDir: 'dist',
    emptyOutDir: true,
    
    // Asset handling
    assetsDir: 'assets',
    
    // CSS code splitting
    cssCodeSplit: true
  },

  // ✅ DEVELOPMENT SERVER CONFIGURATION (for local testing)
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    
    // ✅ SIMPLIFIED PROXY FOR DEVELOPMENT ONLY
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true,
        secure: false
      }
    },

    cors: {
      origin: true,
      credentials: true
    },

    hmr: {
      host: '0.0.0.0',
      port: 5173
    }
  },

  // ✅ PREVIEW SERVER (for testing production build locally)
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=31536000'
    }
  },

  // ✅ CSS OPTIMIZATION
  css: {
    postcss: {},
    // Minimize CSS in production
    devSourcemap: false
  },

  // ✅ ENVIRONMENT VARIABLES
  envPrefix: ['VITE_'],
  
  // ✅ OPTIMIZATION FOR VERCEL
  esbuild: {
    // Remove console.logs in production
    drop: ['console', 'debugger']
  },

  // ✅ DEPENDENCY OPTIMIZATION
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'axios', 
      'react-router-dom',
      'socket.io-client',
      'react-bootstrap',
      'bootstrap'
    ],
    exclude: ['@vitejs/plugin-react']
  }
})
