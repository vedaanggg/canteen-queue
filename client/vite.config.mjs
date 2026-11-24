export default {
  optimizeDeps: {
    noDiscovery: true,
    include: ['react', 'react-dom/client', 'react-router-dom', 'socket.io-client'],
  },
  server: { fs: { allow: [process.cwd()] } },
};
