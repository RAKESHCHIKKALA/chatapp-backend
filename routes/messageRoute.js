const express = require("express");
const route = express.Router();
const createconnection = require("../config/connection");
const { ObjectId } = require("mongodb");
const multer = require("multer");
const path = require("path");

// ================= MULTER STORAGE =================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, "../uploads")); // Save inside /uploads
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

// ===================== SEND MESSAGE (TEXT/FILE) =====================
route.post("/send", upload.single("file"), async (req, res) => {
  try {
    console.log("Message send request body:", req.body);
    console.log("Message send request file:", req.file);
    
    const { chatId, senderId, message, senderName } = req.body;

    if (!chatId || !senderId || !senderName) {
      console.log("Missing required fields:", { chatId, senderId, senderName });
      return res.status(400).json({
        ok: false,
        error: "Chat ID, sender ID and sender name are required",
      });
    }

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const collection = await createconnection("messages");

    const newMessage = {
      chatId,
      senderId,
      senderName,
      message: message || null,
      fileUrl,
      timestamp: new Date(),
      isEdited: false,
      isDeleted: false,
      editHistory: [],
    };

    const result = await collection.insertOne(newMessage);
    const savedMessage = { ...newMessage, _id: result.insertedId };
    
    console.log("Message saved successfully:", savedMessage);

    res.status(201).json({
      ok: true,
      message: savedMessage,
    });
  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to send message",
      details: error.message,
    });
  }
});

// ===================== GET MESSAGES FOR CHAT =====================
route.get("/chat/:chatId", async (req, res) => {
  try {
    const { chatId } = req.params;

    if (!chatId) {
      return res.status(400).json({
        ok: false,
        error: "Chat ID is required",
      });
    }

    let queryId;
    try {
      queryId = new ObjectId(chatId);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid chat ID format",
      });
    }

    const collection = await createconnection("messages");
    const messages = await collection
      .find({ chatId: queryId, isDeleted: false })
      .sort({ timestamp: 1 })
      .toArray();

    res.status(200).json({
      ok: true,
      messages: messages,
    });
  } catch (error) {
    console.error("Get messages error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to get messages",
      details: error.message,
    });
  }
});

// ===================== EDIT MESSAGE =====================
route.put("/edit/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { newMessage, userId } = req.body;

    if (!messageId || !newMessage || !userId) {
      return res.status(400).json({
        ok: false,
        error: "Message ID, new message, and user ID are required",
      });
    }

    const collection = await createconnection("messages");

    let queryId;
    try {
      queryId = new ObjectId(messageId);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid message ID format",
      });
    }

    const message = await collection.findOne({ _id: queryId });

    if (!message) {
      return res.status(404).json({
        ok: false,
        error: "Message not found",
      });
    }

    if (String(message.senderId) !== userId) {
      return res.status(403).json({
        ok: false,
        error: "You can only edit your own messages",
      });
    }

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    if (message.timestamp < fourHoursAgo) {
      return res.status(400).json({
        ok: false,
        error: "Messages can only be edited within 4 hours of sending",
      });
    }

    const editHistory = message.editHistory || [];
    editHistory.push({
      previousMessage: message.message,
      editedAt: new Date(),
    });

    const result = await collection.updateOne(
      { _id: queryId },
      {
        $set: {
          message: newMessage,
          isEdited: true,
          editHistory: editHistory,
          lastEditedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        ok: false,
        error: "Failed to update message",
      });
    }

    res.status(200).json({
      ok: true,
      message: "Message edited successfully",
    });
  } catch (error) {
    console.error("Edit message error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to edit message",
      details: error.message,
    });
  }
});

// ===================== DELETE MESSAGE =====================
route.delete("/delete/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { userId } = req.body;

    if (!messageId || !userId) {
      return res.status(400).json({
        ok: false,
        error: "Message ID and user ID are required",
      });
    }

    const collection = await createconnection("messages");

    let queryId;
    try {
      queryId = new ObjectId(messageId);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid message ID format",
      });
    }

    const message = await collection.findOne({ _id: queryId });

    if (!message) {
      return res.status(404).json({
        ok: false,
        error: "Message not found",
      });
    }

    if (String(message.senderId) !== userId) {
      return res.status(403).json({
        ok: false,
        error: "You can only delete your own messages",
      });
    }

    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000);
    if (message.timestamp < fourHoursAgo) {
      return res.status(400).json({
        ok: false,
        error: "Messages can only be deleted within 4 hours of sending",
      });
    }

    const result = await collection.updateOne(
      { _id: queryId },
      {
        $set: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      return res.status(400).json({
        ok: false,
        error: "Failed to delete message",
      });
    }

    res.status(200).json({
      ok: true,
      message: "Message deleted successfully",
    });
  } catch (error) {
    console.error("Delete message error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to delete message",
      details: error.message,
    });
  }
});

module.exports = route;
