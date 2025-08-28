

# ChatApp Backend

This is the backend server for the ChatApp project.  
It provides REST APIs and WebSocket support for real-time messaging.

## Features
- User authentication with JWT
- Real-time chat using Socket.io
- Stores messages in MongoDB
- REST APIs for user and message management
- Role-based access control (optional)

## Tech Stack
- Node.js + Express.js
- MongoDB (or any preferred database)
- Socket.io for real-time communication
- JWT for authentication
- Mongoose for MongoDB ORM


Install dependencies:

bash

npm install
Setup environment variables:

text

PORT=5409
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
Start the server:

bash

npm run start
or for development with hot reload:

bash

npm run dev
Server will run on http://localhost:5409
