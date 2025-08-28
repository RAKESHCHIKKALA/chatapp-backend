const express=require("express");
const route=express.Router()
const verifyToken=require("../middleware/verifytoken");
const createconnection=require("../config/connection")
const { ObjectId } = require("mongodb");

// Get user chats by user ID (without auth for now)
route.get("/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "User ID is required",
      });
    }

    let queryId;
    try {
      queryId = new ObjectId(userId);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid user ID format",
      });
    }

    const chatsCollection = await createconnection("chats");
    const messagesCollection = await createconnection("messages");
    
    // Get chats where user is a member
    const chats = await chatsCollection
      .find({ members: queryId })
      .toArray();

    // For each chat, get the last message and format the response
    const formattedChats = await Promise.all(
      chats.map(async (chat) => {
        // Get the last message for this chat
        const lastMessage = await messagesCollection
          .find({ chatId: chat._id, isDeleted: false })
          .sort({ timestamp: -1 })
          .limit(1)
          .next();

        // Get unread count (messages not from this user)
        const unreadCount = await messagesCollection.countDocuments({
          chatId: chat._id,
          senderId: { $ne: queryId },
          isDeleted: false,
          // Add read status logic here later
        });

        // Get the other user's info (assuming 2-person chats for now)
        const otherUserId = chat.members.find(id => !id.equals(queryId));
        const usersCollection = await createconnection("users");
        const otherUser = await usersCollection.findOne({ _id: otherUserId });

        return {
          _id: String(chat._id),
          name: otherUser?.name || otherUser?.mail || 'Unknown User',
          userName: otherUser?.name || otherUser?.mail || 'Unknown User',
          lastMessage: lastMessage?.message || 'No messages yet',
          lastMessageTime: lastMessage?.timestamp || null,
          unreadCount: unreadCount || 0,
          isOnline: false, // TODO: Implement online status
          members: chat.members.map(id => String(id))
        };
      })
    );

    res.status(200).json({
      ok: true,
      chats: formattedChats,
    });
  } catch (error) {
    console.error("Get user chats error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to get user chats",
      details: error.message,
    });
  }
});

// Create chat between two users (without auth for now)
route.post("/create", async (req, res) => {
  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      return res.status(400).json({
        ok: false,
        error: "Both user IDs are required",
      });
    }

    let user1Id, user2Id;
    try {
      user1Id = new ObjectId(userId1);
      user2Id = new ObjectId(userId2);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid user ID format",
      });
    }

    const chatsCollection = await createconnection("chats");
    
    // Check if chat already exists between these users
    const existingChat = await chatsCollection.findOne({
      members: { $all: [user1Id, user2Id] }
    });

    if (existingChat) {
      return res.status(200).json({
        ok: true,
        chat: {
          _id: String(existingChat._id),
          members: existingChat.members.map(id => String(id))
        },
        message: "Chat already exists"
      });
    }

    // Create new chat
    const newChat = {
      members: [user1Id, user2Id],
      createdAt: new Date(),
      messageCount: 0
    };

    const result = await chatsCollection.insertOne(newChat);

    res.status(201).json({
      ok: true,
      chat: {
        _id: String(result.insertedId),
        members: newChat.members.map(id => String(id))
      },
      message: "Chat created successfully"
    });
  } catch (error) {
    console.error("Create chat error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to create chat",
      details: error.message,
    });
  }
});

route.get("/getuserchats",verifyToken,async(req,res)=>{
   try{

     const chats=await createconnection("chats");
  const chatdata=await 
  chats
  .find({_id:{$in:[new ObjectId(req.userdata)]}}).toArray()
    res.send({
        ok:true,
        data:chatdata,
    });
   }catch(error){
    res.send({
    ok:false,
    error:error,
    });
   }
});
//http://localhost:5409/chats/getuserchats
route.post("/create-chat",verifyToken,async(req,res)=>{
  try{
    console.log("Create chat request body:", req.body);
    console.log("User data from token:", req.userdata);
    
    const toUserId=req.body.id;
    var chats=await createconnection("chats");
    var data=await 
    chats.insertOne({
      messagecount:0,
      members:[new ObjectId(req.userdata._id),new ObjectId(req.body.id)]})
      console.log("Chat created successfully:", data);
      res.send({
        ok:true,
        result:data,
      });
  }catch(error){
    console.error("Chat creation error:", error);
    res.send({
      ok:false,
      error:error.message,
      
    });
  }
});

// Get all users (without auth for now)
route.get("/users", async (req, res) => {
  try {
    const usersCollection = await createconnection("users");
    const users = await usersCollection
      .find({})
      .project({ password: 0 }) // Exclude password
      .toArray();

    const formattedUsers = users.map(user => ({
      _id: String(user._id),
      name: user.name || user.mail || 'Unknown User',
      lastName: user.lastName || '',
      mail: user.mail,
      phone: user.phone || '',
      gender: user.gender || ''
    }));

    res.status(200).json({
      ok: true,
      users: formattedUsers,
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      ok: false,
      error: "Failed to get users",
      details: error.message,
    });
  }
});

route.get("/getAllusers",verifyToken,async(req,res)=>{
        try{
            const userCollection=await createconnection("users");
           const data=await userCollection.find({_id: {$ne:req.userdata._id}}).toArray()
          res.send({
            ok:true,
            result:data,
          });
        }catch(error){
            res.send({
              ok:false,
              result:error,
            });
        }
});

module.exports=route;