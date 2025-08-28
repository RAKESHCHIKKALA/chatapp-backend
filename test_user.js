const createconnection = require("./config/connection");

async function testDatabase() {
  try {
    console.log("Testing database connection...");
    
    // Test users collection
    const usersCollection = await createconnection("users");
    console.log("Users collection connected");
    
    // Check if there are any users
    const userCount = await usersCollection.countDocuments();
    console.log(`Number of users in database: ${userCount}`);
    
    if (userCount === 0) {
      console.log("No users found. Creating a test user...");
      
      const testUser = {
        name: "Test User",
        lastName: "Test",
        mail: "test@example.com",
        phone: "1234567890",
        password: "password123",
        gender: "male"
      };
      
      const result = await usersCollection.insertOne(testUser);
      console.log("Test user created with ID:", result.insertedId);
      
      // Verify the user was created
      const createdUser = await usersCollection.findOne({ mail: "test@example.com" });
      console.log("Created user:", createdUser);
    } else {
      // List existing users
      const users = await usersCollection.find({}).limit(5).toArray();
      console.log("Existing users:", users.map(u => ({ name: u.name, mail: u.mail })));
    }
    
    // Test chats collection
    const chatsCollection = await createconnection("chats");
    console.log("Chats collection connected");
    
    const chatCount = await chatsCollection.countDocuments();
    console.log(`Number of chats in database: ${chatCount}`);
    
    // Test messages collection
    const messagesCollection = await createconnection("messages");
    console.log("Messages collection connected");
    
    const messageCount = await messagesCollection.countDocuments();
    console.log(`Number of messages in database: ${messageCount}`);
    
    console.log("Database test completed successfully!");
    
  } catch (error) {
    console.error("Database test failed:", error);
  } finally {
    process.exit(0);
  }
}

testDatabase();

