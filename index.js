const express = require('express'); // Import the Express framework to create the server
const mongoose = require('mongoose'); // Import Mongoose for MongoDB interaction
const cors = require('cors'); // Import CORS to handle cross-origin requests
require('dotenv').config(); // Load environment variables from a .env file

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
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true,
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
		default: () => new Date().toDateString(),
	}, // Date of the exercise (defaults to current date)
});

// Create models based on the schemas to interact with the 'users' and 'exercises' collections in MongoDB
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Serve the homepage (index.html) when the root URL is accessed
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html'); // Sends the HTML file from the views directory
});

// Route to create a new user
// The username is sent in the request body, a new user is created and saved to the database
app.post('/api/users', async (req, res) => {
	const { username } = req.body; // Extract username from the request body
	try {
		const newUser = new User({ username }); // Create a new User instance
		const savedUser = await newUser.save(); // Save the new user to the database
		res.status(201).json(savedUser); // Respond with the newly created user
	} catch (error) {
		res.status(400).json({ error: error.message }); // Handle errors (e.g., duplicate usernames)
	}
});

// Route to get all users
// It fetches all users from the database, showing only the 'username' and '_id' fields
app.get('/api/users', async (req, res) => {
	const users = await User.find(
		{},
		{ username: 1, _id: 1 }
	); // Fetch all users (only username and _id)
	res.json(users); // Respond with the list of users
});

// Route to add an exercise to a specific user
// The user's ID is in the URL parameter, and the exercise details are in the request body
app.post('/api/users/:_id/exercises', async (req, res) => {
	const { description, duration, date } = req.body; // Extract exercise details from the request body
	const userId = req.params._id; // Extract user ID from the URL parameter

	// Create a new Exercise instance and save it to the database
	const exercise = new Exercise({
		userId, // Associate the exercise with the user
		description, // Description of the exercise
		duration, // Duration in minutes
		date: date
			? new Date(date).toDateString()
			: new Date().toDateString(), // Optional date, default to current date
	});

	await exercise.save(); // Save the exercise to the database

	const user = await User.findById(userId); // Find the user by ID in the database

	// Respond with user details and the exercise information
	res.json({
		username: user.username,
		_id: userId,
		description,
		duration,
		date: exercise.date,
	});
});

// Route to get a user's exercise log
// The user's ID is in the URL parameter, and optional 'from', 'to', and 'limit' query parameters filter the log
app.get('/api/users/:_id/logs', async (req, res) => {
	const userId = req.params._id; // Extract user ID from the URL parameter
	const { from, to, limit } = req.query; // Extract optional query parameters

	const query = { userId }; // Base query to find exercises for this user
	if (from)
		query.date = { ...query.date, $gte: new Date(from) }; // Add 'from' date filter if provided
	if (to)
		query.date = { ...query.date, $lte: new Date(to) }; // Add 'to' date filter if provided

	// Find exercises matching the query, limit results if 'limit' is provided
	const exercises = await Exercise.find(query).limit(
		parseInt(limit)
	);
	const user = await User.findById(userId); // Find the user by ID

	// Respond with the user's username, the count of exercises, and the log of exercises
	res.json({
		username: user.username,
		count: exercises.length, // Number of exercises
		_id: userId,
		log: exercises.map(
			({ description, duration, date }) => ({
				// Map each exercise to the desired format
				description,
				duration,
				date,
			})
		),
	});
});

// Start the server and listen on the specified port (from .env file or default to 3000)
const listener = app.listen(
	process.env.PORT || 3000,
	() => {
		console.log(
			'Your app is listening on port ' +
				listener.address().port
		); // Log the port the server is running on
	}
);
