const express = require('express');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');
require('dotenv').config();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");


/*<<<<<<< HEAD
const path = require("path");


=======
>>>>>>> f848c781d19c0b3ea049de871a2565762e3208cd
*/
const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(cors());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true,
}));


const mongoUri = process.env.MONGO_URI;
const secret_key = process.env.JWT_SECRET;
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

// Registration Route (does bcrypt)
app.post("/register", async (req, res) => {
  const { username, email, password, role } = req.body;
  if (!username || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }
  const existingUser = await usersCollection.findOne({
    $or: [{ email }, { username }],
  });

  if (existingUser) {
    return res.status(400).json({
      message: "Email or Username is already taken.",
    });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await usersCollection.insertOne({ username, email, password: hashedPassword, role });
    res.status(201).json({
      message: "User registered successfully",
      user: { username, email, role },
    });
  } catch (error) {
    console.error("Error registering user:", error);
    res.status(500).json({
      message: "An error occurred during registration. Please try again later.",
    });
  }
});

// Login Route (does bcrypt)
app.post("/login", async (req, res) => {
  const { email, password, role } = req.body;
  const user = await usersCollection.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(400).json("Invalid credentials");
  }
  if (user.role !== role) {
    return res.status(400).json({ message: "Role mismatch. Please select the correct role." });
  }
  // Generate and return a JWT token
  const token = jwt.sign(
    { username: user.username, email: user.email, role: user.role },
    secret_key,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

// add a new quiz
app.post('/api/quizzes', async (req, res) => {
  try {
    const quiz = req.body;
    const result = await quizzesCollection.insertOne(quiz);
    res.status(201).json(result);
  } catch (error) {
    console.error('Error saving quiz:', error);
    res.status(500).json({ error: 'Failed to save quiz' });
  }
});

// get a quiz in quizzes page
app.get('/api/quizzes', async (req, res) => {
  try {
    const quizzes = await quizzesCollection.find().toArray();
    res.status(200).json(quizzes);
  } catch (error) {
    console.error('Error fetching quizzes:', error);
    res.status(500).json({ error: 'Failed to fetch quizzes' });
  }
});

// delete quiz
app.delete('/api/quizzes/:id', async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid ID' });
  }
  try {
    const result = await quizzesCollection.deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Quiz not found' });
    }
    res.status(200).json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Error deleting quiz:', error);
    res.status(500).json({ error: 'Failed to delete quiz' });
  }
});


// route to get user role using token

app.get('/api/users', async (req, res) => {
  const authHeader = req.headers.authorization;

  // Check if the Authorization header is present
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1]; // Extract the token from the header

  try {
    // Verify the token using the secret key
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Respond with the user's role and optionally other user details
    res.status(200).json({
      role: decoded.role,
      username: decoded.username,
      email: decoded.email,
    });
  } catch (err) {
    console.error('Error verifying token:', err);
    res.status(403).json({ message: 'Invalid or expired token' });
  }
});


//route to get quizData in Lobby 
app.get('/quiz/:quizCode', async (req, res) => {
  const { quizCode } = req.params;

  if (!quizCode) {
    return res.status(400).json({ message: "Quiz code is required." });
  }

  try {
    const quiz = await quizzesCollection.findOne({ quizId: Number(quizCode) });
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found." });
    }

    res.status(200).json(quiz);
  } catch (error) {
    console.error("Error fetching quiz data:", error);
    res.status(500).json({ message: "Internal server error." });
  }
});




// update an existing quiz 
app.put('/api/quizzes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, questions } = req.body;
    const quizId = new ObjectId(id);
    const quizzesCollection = client.db('quizApp').collection('quizzes');
    const result = await quizzesCollection.updateOne(
      { _id: quizId },
      { $set: { title, description, questions } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ message: 'Quiz not found' });
    }
    res.status(200).json({ message: 'Quiz updated successfully' });
  } catch (error) {
    console.error('Error updating quiz:', error); //error to help with debbugging 
    res.status(500).json({ message: 'Failed to update quiz', error: error.message || error });
  }
});


// Start the server 
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

