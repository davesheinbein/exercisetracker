const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

// User and Exercise Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String, default: () => new Date().toDateString() }
});

// Models
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.status(201).json(savedUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/users', async (req, res) => {
  const users = await User.find({}, { username: 1, _id: 1 });
  res.json(users);
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body;
  const userId = req.params._id;

  const exercise = new Exercise({
    userId,
    description,
    duration,
    date: date ? new Date(date).toDateString() : new Date().toDateString()
  });

  await exercise.save();
  
  const user = await User.findById(userId);
  res.json({ username: user.username, description, duration, date: exercise.date, _id: userId });
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const userId = req.params._id;
  const { from, to, limit } = req.query;

  const query = { userId };
  if (from) query.date = { ...query.date, $gte: new Date(from) };
  if (to) query.date = { ...query.date, $lte: new Date(to) };

  const exercises = await Exercise.find(query).limit(parseInt(limit));
  const user = await User.findById(userId);

  res.json({
    username: user.username,
    count: exercises.length,
    _id: userId,
    log: exercises.map(({ description, duration, date }) => ({
      description,
      duration,
      date
    }))
  });
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
