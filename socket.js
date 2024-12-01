const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http')
const { MongoClient, ObjectId } = require('mongodb');
const express = require('express');
require('dotenv').config();

const app = express();
const server = http.createServer(app)

const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
})

const mongoUri = process.env.MONGO_URI; 
const client = new MongoClient(mongoUri, { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
});

let quizzesCollection, usersCollection;

client.connect().then(() => {
  console.log("Connected to MongoDB");
  const db = client.db("quizApp"); 
  quizzesCollection = db.collection("quizzes"); 
  usersCollection = db.collection("users");
});

//Checking if the quizz code is valid
io.on("connection", (socket) => {
    console.log(`User is connected: ${socket.id}`);
  
    socket.on("send_code", async (code) => {
      console.log("Received quiz code:", code);
      try {
        const quiz = await quizzesCollection.findOne( {quizId: Number(code)} );
    
        if (quiz && quiz.isValid) {
          socket.emit('checkQuizCode', { isValid: true });
        } else {
          socket.emit('checkQuizCode', { isValid: false });
        }
      } catch (err) {
        console.error("Error querying database:", err);
        socket.emit('checkQuizCode', { isValid: false });
      }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
      });
})

server.listen(3001, () => {
    console.log(`Socket server 3001 is running!`)
})