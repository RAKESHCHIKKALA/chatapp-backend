const express = require("express");
const app = express();
const port = 5409;
const cors = require("cors");
const http = require("http");
const path = require("path");

const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173", // your frontend
    methods: ["GET", "POST"],
  },
});

// MongoDB connection helper
const createconnection = require("./config/connection");
const { ObjectId } = require("mongodb");

// Import Routes
const chatsRoute = require("./routes/chatRoute");
const userRoute = require("./routes/userRoute");
const messageRoute = require("./routes/messageRoute");

// ----------------- MIDDLEWARE -----------------
// Configure CORS
app.use(cors({
  origin: "http://localhost:5173", // your frontend URL
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json());
// Serve uploaded files (images/docs/etc)
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// ----------------- SOCKET.IO -----------------
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Join a chat room
  socket.on("join_room", (chatId) => {
    socket.join(chatId);
    console.log(`User ${socket.id} joined room: ${chatId}`);
  });

  // Handle new message
  socket.on("send_message", async (data) => {
    try {
      const { chatId, message, senderId, senderName, fileUrl } = data;

      if (!chatId || !senderId || !senderName) {
        return;
      }

      // Save message in DB
      const collection = await createconnection("messages");
      const newMessage = {
        chatId,
        senderId,
        senderName,
        message: message || null,
        fileUrl: fileUrl || null,
        timestamp: new Date(),
        isEdited: false,
        isDeleted: false,
        editHistory: [],
      };

      const result = await collection.insertOne(newMessage);
      const savedMessage = { ...newMessage, _id: result.insertedId };

      // Broadcast message to everyone in the chat room (including sender)
      io.to(chatId).emit("receive_message", savedMessage);

      console.log(`Message saved & broadcast to room ${chatId}`);
    } catch (error) {
      console.error("Error handling message:", error);
    }
  });

  // Typing indicator
  socket.on("typing", (data) => {
    socket.to(data.chatId).emit("user_typing", {
      chatId: data.chatId,
      userId: data.userId,
      userName: data.userName,
    });
  });

  // Stop typing
  socket.on("stop_typing", (data) => {
    socket.to(data.chatId).emit("user_stop_typing", {
      chatId: data.chatId,
      userId: data.userId,
    });
  });

  // Disconnect
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// ----------------- ROUTES -----------------
app.use("/users", userRoute);
app.use("/chats", chatsRoute);
app.use("/messages", messageRoute);

// Test route to check if server is working
app.get("/test", (req, res) => {
  res.json({ ok: true, message: "Server is running" });
});

// ----------------- ERROR HANDLERS -----------------

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: "Route not found",
  });
});

// General error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    ok: false,
    error: "Internal server error",
    details: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ----------------- START SERVER -----------------
server.listen(port, () => {
  console.log(`🚀 Server running on http://localhost:${port}`);
});
