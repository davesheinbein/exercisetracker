// Import the Express framework to create the server
const express = require('express');
// Import Mongoose for MongoDB interaction
const mongoose = require('mongoose');
// Import CORS to handle cross-origin requests
const cors = require('cors');
// Import moment for date handling
const moment = require('moment');
// Load environment variables from a .env file
require('dotenv').config();

// Initialize an Express app
const app = express();

// Enable CORS to allow requests from other origins
app.use(cors());

// Enable Express to parse incoming JSON data
app.use(express.json());

// Serve static files from the 'public' folder (e.g., HTML, CSS)
app.use(express.static('public'));

// Parse URL-encoded data (form submissions)
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
console.log('Connecting to MongoDB...');
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,
		useUnifiedTopology: true,
	})
	.then(() => console.log('Connected to MongoDB'))
	.catch((error) => console.log('MongoDB connection error:', error));

// Define user and exercise schemas
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
});

const exerciseSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, required: true },
	description: { type: String, required: true },
	duration: { type: Number, required: true },
	date: { type: String, default: Date.now },
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Serve the homepage
app.get('/', (req, res) => {
	console.log('GET /');
	res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
	console.log('POST /api/users', req.body);
	const { username } = req.body;
	try {
		const newUser = new User({ username });
		const savedUser = await newUser.save();
		console.log('User created:', savedUser);
		res.status(201).json(savedUser);
	} catch (error) {
		console.log('Error creating user:', error);
		res.status(400).json({ error: error.message });
	}
});

// Get all users
app.get('/api/users', async (req, res) => {
	console.log('GET /api/users');
	const users = await User.find({}, { username: 1, _id: 1 });
	console.log('Users:', users);
	res.json(users);
});

// Add an exercise to a specific user
app.post('/api/users/:_id/exercises', async (req, res) => {
	console.log('POST /api/users/:_id/exercises', req.body);
	const { description, duration, date } = req.body;
	const userId = req.params._id;

	try {
		const exercise = new Exercise({
			userId,
			description,
			duration,
			date: date ? new Date(date).toDateString() : new Date().toDateString(),
		});
		await exercise.save();
		console.log('Exercise saved:', exercise);

		const user = await User.findById(userId);
		if (!user) {
			console.log('User not found:', userId);
			return res.status(404).json({ error: 'User not found' });
		}

		console.log('User found:', user);
		res.json({
			_id: user._id,
			username: user.username,
			description: exercise.description,
			duration: exercise.duration,
			date: exercise.date,
		});
	} catch (error) {
		console.log('Error adding exercise:', error);
		res.status(400).json({ error: error.message });
	}
});

// Get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
	console.log('GET /api/users/:_id/logs', req.query);
	const userId = req.params._id;
	const { from, to, limit } = req.query;
	const query = { userId };

	if (from) {
		const fromDate = moment(from, 'YYYY-MM-DD');
		if (fromDate.isValid()) {
			query.date = { ...query.date, $gte: fromDate.format('YYYY-MM-DD') };
		} else {
			console.log('Invalid "from" date:', from);
			return res.status(400).json({ error: 'Invalid "from" date' });
		}
	}

	if (to) {
		const toDate = moment(to, 'YYYY-MM-DD');
		if (toDate.isValid()) {
			query.date = { ...query.date, $lte: toDate.format('YYYY-MM-DD') };
		} else {
			console.log('Invalid "to" date:', to);
			return res.status(400).json({ error: 'Invalid "to" date' });
		}
	}

	console.log('Query:', query);

	try {
		const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);
		console.log('Exercises found:', exercises.length);

		const user = await User.findById(userId);
		if (!user) {
			console.log('User not found:', userId);
			return res.status(404).json({ error: 'User not found' });
		}

		console.log('User found:', user);
		res.json({
			username: user.username,
			count: exercises.length,
			_id: userId,
			log: exercises.map(({ description, duration, date }) => ({
				description,
				duration,
				date: moment(date).format('ddd MMM DD YYYY'),
			})),
		});
	} catch (error) {
		console.log('Error fetching logs:', error);
		res.status(400).json({ error: error.message });
	}
});

// Start the server
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Server is running on port', listener.address().port);
});
