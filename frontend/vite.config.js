import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    global: 'globalThis',
  },
  
  // ✅ FIXED: Build configuration
  build: {
    // ✅ MODERN TARGET: Support for destructuring and modern JS
    target: ['es2018', 'chrome70', 'firefox62', 'safari12', 'edge79'],
    
    // ✅ FIXED: Use esbuild instead of terser (built-in, no extra package needed)
    minify: 'esbuild',
    sourcemap: false,
    
    // Optimize chunk splitting
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          ui: ['react-bootstrap', '@popperjs/core', 'bootstrap'],
          utils: ['axios', 'lucide-react', 'react-icons'],
          router: ['react-router-dom'],
          socket: ['socket.io-client']
        }
      }
    },
    
    chunkSizeWarningLimit: 1000,
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    cssCodeSplit: true
  },

  // Development server
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    
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
    }
  },

  // Preview server
  preview: {
    host: '0.0.0.0',
    port: 4173,
    cors: true
  },

  // CSS optimization
  css: {
    devSourcemap: false
  },

  // Environment variables
  envPrefix: ['VITE_'],
  
  // ✅ OPTIMIZATION: esbuild for minification (no extra dependencies)
  esbuild: {
    drop: ['console', 'debugger']
  },

  // Dependency optimization
  optimizeDeps: {
    include: [
      'react', 
      'react-dom', 
      'axios', 
      'react-router-dom',
      'socket.io-client',
      'react-bootstrap',
      'bootstrap'
    ]
  }
})
