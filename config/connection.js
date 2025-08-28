const { MongoClient } = require("mongodb");

let mongoclient = null;
let isConnected = false;

async function createconnection(collectionName = "users") {
  try {
    if (!mongoclient) {
      mongoclient = new MongoClient("mongodb://localhost:27017");
    }
    
    if (!isConnected) {
      await mongoclient.connect();
      isConnected = true;
      console.log("Connected to MongoDB");
    }
    
    const db = mongoclient.db("chatapp");
    const collection = db.collection(collectionName);
    return collection;
  } catch (error) {
    console.error("Database connection error:", error);
    throw error;
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (mongoclient && isConnected) {
    await mongoclient.close();
    console.log("MongoDB connection closed");
    process.exit(0);
  }
});

module.exports = createconnection;