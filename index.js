// Import the Express framework to create the server
const express = require('express');
// Import Mongoose for MongoDB interaction
const mongoose = require('mongoose');
// Import CORS to handle cross-origin requests
const cors = require('cors');
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

// Connect to MongoDB using the connection string stored in environment variables (MONGO_URI)
// useNewUrlParser and useUnifiedTopology options are to handle deprecations
console.log("Connecting to MongoDB...");
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
}).then(() => {
    console.log('MongoDB connection established');
}).catch((error) => {
    console.log('Error connecting to MongoDB:', error);
});

// Define a schema for users where each user must have a unique and required 'username'
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true }, // A user must have a unique username
});

// Define a schema for exercises where each exercise is linked to a user by 'userId'
// Each exercise has a 'description', 'duration', and an optional 'date' (defaults to the current date)
const exerciseSchema = new mongoose.Schema({
	userId: { 
	  type: mongoose.Schema.Types.ObjectId,
	  required: true,
	}, // Reference to the User model
	description: { type: String, required: true }, // Description of the exercise
	duration: { type: Number, required: true }, // Duration of the exercise in minutes
	date: {
	  type: String,
	  default: Date.now,
	}, // Date of the exercise (defaults to current date)
});

// Create models based on the schemas to interact with the 'users' and 'exercises' collections in MongoDB
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Serve the homepage (index.html) when the root URL is accessed
app.get('/', (req, res) => {
	console.log("GET request to '/'");
	res.sendFile(__dirname + '/views/index.html');
});

// Route to create a new user
app.post('/api/users', async (req, res) => {
	console.log("POST request to '/api/users' with data:", req.body);
	const { username } = req.body;
	try {
		const newUser = new User({ username });
		const savedUser = await newUser.save();
		console.log("New user created:", savedUser);
		res.status(201).json(savedUser);
	} catch (error) {
		console.log("Error creating user:", error);
		res.status(400).json({ error: error.message });
	}
});

// Route to get all users
app.get('/api/users', async (req, res) => {
	console.log("GET request to '/api/users'");
	const users = await User.find({}, { username: 1, _id: 1 });
	console.log("Users found:", users);
	res.json(users);
});

// Route to add an exercise to a specific user
app.post('/api/users/:_id/exercises', async (req, res) => {
	console.log("POST request to '/api/users/:_id/exercises' with data:", req.body);
	const { description, duration, date } = req.body;
	const userId = req.params._id;

	try {
		console.log("Creating new exercise for user ID:", userId);
		const exercise = new Exercise({
			userId,
			description,
			duration,
			date: date ? new Date(date).toDateString() : new Date().toDateString(),
		});

		await exercise.save();
		console.log("Exercise saved:", exercise);

		const user = await User.findById(userId);
		if (!user) {
			console.log("User not found with ID:", userId);
			return res.status(404).json({ error: "User not found" });
		}

		console.log("User found:", user);
		res.json({
			_id: user._id,
			username: user.username,
			description: exercise.description,
			duration: exercise.duration,
			date: exercise.date,
		});
	} catch (error) {
		console.log("Error adding exercise:", error);
		res.status(400).json({ error: error.message });
	}
});

// Route to get a user's exercise log
app.get('/api/users/:_id/logs', async (req, res) => {
	console.log("GET request to '/api/users/:_id/logs' with query:", req.query);
	const userId = req.params._id;
	const { from, to, limit } = req.query;

	const query = { userId };

	// If 'from' query parameter is provided, add date condition for greater than or equal
	if (from) {
		const fromDate = new Date(from);
		if (!isNaN(fromDate)) {
			console.log(`Adding 'from' date filter: ${fromDate}`);
			query.date = { ...query.date, $gte: fromDate };
		} else {
			return res.status(400).json({ error: "'from' date is invalid" });
		}
	}

	// If 'to' query parameter is provided, add date condition for less than or equal
	if (to) {
		const toDate = new Date(to);
		if (!isNaN(toDate)) {
			console.log(`Adding 'to' date filter: ${toDate}`);
			query.date = { ...query.date, $lte: toDate };
		} else {
			return res.status(400).json({ error: "'to' date is invalid" });
		}
	}

	try {
		console.log("Finding exercises with query:", query);
		// If 'limit' is provided, use it; otherwise, fetch all exercises
		const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);
		console.log("Exercises found:", exercises);

		const user = await User.findById(userId);
		if (!user) {
			console.log("User not found with ID:", userId);
			return res.status(404).json({ error: "User not found" });
		}

		console.log("User found:", user);
		res.json({
			username: user.username,
			count: exercises.length,
			_id: userId,
			log: exercises.map(({ description, duration, date }) => ({
				description,
				duration,
				date,
			})),
		});
	} catch (error) {
		console.log("Error retrieving logs:", error);
		res.status(400).json({ error: error.message });
	}
});


// Start the server and listen on the specified port (from .env file or default to 3000)
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});
