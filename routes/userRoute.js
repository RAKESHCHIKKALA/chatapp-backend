// routes/user.js
const express = require("express");
const route = express.Router();
const jwt = require("jsonwebtoken");
const createconnection = require("../config/connection");
const { ObjectId } = require("mongodb");

const secret_key =
  "dbwffrakegsbchikkkaltgtafgdybnnnnnnstbdhjdnndiqdwfufwqfoihfsdfbfwauifgwfxwnfwfufef";

// ===================== GET USER INFO =====================
route.get("/profile/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "User ID is required",
      });
    }

    const collection = await createconnection();
    
    // Convert string ID to ObjectId if it's a valid ObjectId
    let queryId;
    try {
      queryId = new ObjectId(userId);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid user ID format",
      });
    }
    
    const user = await collection.findOne({ _id: queryId });

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    // Remove password and other sensitive fields
    const { password, ...safeUser } = user;

    // Ensure _id is string
    if (safeUser._id && typeof safeUser._id !== "string") {
      safeUser._id = String(safeUser._id);
    }

    res.status(200).json({
      ok: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to get user profile",
      details: error.message,
    });
  }
});

// ===================== GET LOGGED IN USER =====================
route.get("/loguser", async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        ok: false,
        error: "No token provided",
      });
    }

    // Verify token
    const decoded = jwt.verify(token, secret_key);
    const userId = decoded._id;

    const collection = await createconnection();
    const user = await collection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({
        ok: false,
        error: "User not found",
      });
    }

    // Remove password and other sensitive fields
    const { password, ...safeUser } = user;

    // Ensure _id is string
    if (safeUser._id && typeof safeUser._id !== "string") {
      safeUser._id = String(safeUser._id);
    }

    res.status(200).json({
      ok: true,
      user: safeUser,
    });
  } catch (error) {
    console.error("Get logged user error:", error);
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        ok: false,
        error: "Invalid token",
      });
    }
    res.status(500).json({
      ok: false,
      error: "Failed to get user info",
      details: error.message,
    });
  }
});

// ===================== SIGNUP =====================
route.post("/signup", async (req, res) => {
  try {
    console.log("Signup request body:", req.body);
    const { name, lastName, mail, phone, password, gender } = req.body;

    // Check required fields
    if (!name || !lastName || !mail || !phone || !password) {
      console.log("Missing required fields:", { name, lastName, mail, phone, password: password ? "***" : "missing" });
      return res.status(400).json({
        ok: false,
        error: "All fields are required",
      });
    }

    const collection = await createconnection();

    // Check if user exists
    const existingUser = await collection.findOne({ mail });
    if (existingUser) {
      console.log("User already exists with email:", mail);
      return res.status(400).json({
        ok: false,
        error: "User already exists with this email",
      });
    }

    // Insert user
    const newUser = { name, lastName, mail, phone, password, gender };
    const resp = await collection.insertOne(newUser);
    console.log("User created successfully with ID:", resp.insertedId);

    res.status(201).json({
      ok: true,
      result: "User created successfully",
      userId: resp.insertedId,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to create user",
      details: error.message,
    });
  }
});

// ===================== SIGNIN =====================
route.post("/signin", async (req, res) => {
  try {
    console.log("Signin request body:", req.body);
    const { mail, password } = req.body;

    if (!mail || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        ok: false,
        message: "Email and password are required",
        result: null,
      });
    }

    const collection = await createconnection();
    const user = await collection.findOne({ mail });
    console.log("User found:", user ? "yes" : "no");

    if (!user) {
      console.log("User not found for email:", mail);
      return res.status(404).json({
        ok: false,
        message: "User not found",
        result: null,
      });
    }

    if (user.password !== password) {
      console.log("Password mismatch for user:", mail);
      return res.status(401).json({
        ok: false,
        message: "Password is incorrect",
        result: null,
      });
    }

    // remove password before sending
    const { password: _removed, ...safeUser } = user;

    // ensure _id is string
    if (safeUser._id && typeof safeUser._id !== "string") {
      safeUser._id = String(safeUser._id);
    }

    const token = jwt.sign(
      { _id: safeUser._id, mail: safeUser.mail },
      secret_key,
      { expiresIn: "24h" }
    );

    console.log("Login successful for user:", safeUser.name);
    console.log("Generated token:", token.substring(0, 20) + "...");

    res.status(200).json({
      ok: true,
      message: "User logged in successfully",
      result: token,
      user: safeUser, // full user info without password
    });
  } catch (error) {
    console.error("Signin error:", error);
    res.status(500).json({
      ok: false,
      message: "Internal server error",
      result: null,
    });
  }
});

module.exports = route;
