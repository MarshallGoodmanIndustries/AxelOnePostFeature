let io;

module.exports = {
    init: httpServer => {
        io = require("socket.io")(httpServer, {
            cors: {
              origin: "https://axelonepostfeature.onrender.com",
              methods: ["GET", "POST"],
              transports: ['websocket', 'polling'],
              credentials: true
          },
          allowEIO3: true
          });
        return io;
    },
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
    }
    return io;
  }
};