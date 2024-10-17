// Import the Express framework to create the server
const express = require('express');

// Import Mongoose to interact with MongoDB
const mongoose = require('mongoose');

// Import CORS middleware to handle cross-origin requests
const cors = require('cors');

// Import moment for date manipulation and formatting
const moment = require('moment');

// Load environment variables (e.g., database URI, port) from a .env file
require('dotenv').config();

// Initialize an Express app (main app object)
const app = express();

// Enable CORS to allow requests from other origins (useful for frontend-backend communication)
app.use(cors());

// Enable Express to parse incoming JSON data in request bodies
app.use(express.json());

// Serve static files (e.g., HTML, CSS) from the 'public' directory
app.use(express.static('public'));

// Enable Express to parse URL-encoded data (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB using Mongoose and environment variables (MONGO_URI)
// Logging a message before attempting the connection
console.log('Connecting to MongoDB...');
mongoose
	.connect(process.env.MONGO_URI, {
		useNewUrlParser: true,        // Use the new URL string parser
		useUnifiedTopology: true,     // Use the new MongoDB topology engine
	})
	.then(() => console.log('Connected to MongoDB'))
	.catch((error) => console.log('MongoDB connection error:', error));

// Define Mongoose schema for a User, with a required and unique 'username'
const userSchema = new mongoose.Schema({
	username: { type: String, required: true, unique: true },
});

// Define Mongoose schema for an Exercise
const exerciseSchema = new mongoose.Schema({
	userId: { type: mongoose.Schema.Types.ObjectId, required: true }, // Reference to the User model
	description: { type: String, required: true }, // Description of the exercise
	duration: { type: Number, required: true }, // Duration in minutes
	date: { type: Date, default: Date.now }, // Default to current date if none provided
});

// Create models from the schemas for MongoDB collections
const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes

// Serve the homepage (static HTML file)
app.get('/', (req, res) => {
	console.log('GET /');
	res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
	console.log('POST /api/users', req.body);
	// Extract username from request body
	const { username } = req.body; 
	try {
		// Create a new User instance
		const newUser = new User({ username }); 
		// Save the new user to the database
		const savedUser = await newUser.save(); 
		console.log('User created:', savedUser);
		// Respond with the saved user
		res.status(201).json(savedUser); 
	} catch (error) {
		console.log('Error creating user:', error);
		// Respond with an error message
		res.status(400).json({ error: error.message }); 
	}
});

// Get all users
app.get('/api/users', async (req, res) => {
	console.log('GET /api/users');
	// Retrieve all users, showing only username and _id
	const users = await User.find({}, { username: 1, _id: 1 }); 
	console.log('Users:', users);
	// Respond with the list of users
	res.json(users); 
});

// Add a new exercise for a specific user
app.post('/api/users/:_id/exercises', async (req, res) => {
    console.log('POST /api/users/:_id/exercises', req.body);
	// Extract data from request body
    const { description, duration, date } = req.body; 
	// Extract user ID from request URL
    const userId = req.params._id; 

    try {
        // Create a new Exercise instance
        const exercise = new Exercise({
            userId,
            description,
            duration,
            date: date ? new Date(date) : new Date(), // Use provided date or current date if not provided
        });
        await exercise.save(); // Save the exercise to the database
        console.log('Exercise saved:', exercise);

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' }); // Respond with error if user not found
        }

        console.log('User found:', user);

        // Respond with user and exercise details, with formatted date
        res.json({
            _id: user._id,
            username: user.username,
            description: exercise.description,
            duration: exercise.duration,
			// Format the date for the response
            date: moment(exercise.date).format('ddd MMM DD YYYY'), 
        });
    } catch (error) {
        console.log('Error adding exercise:', error);
		// Respond with an error message
        res.status(400).json({ error: error.message }); 
    }
});

// Get exercise logs for a specific user
app.get('/api/users/:_id/logs', async (req, res) => {
    console.log('GET /api/users/:_id/logs', req.query);
	// Extract user ID from URL
    const userId = req.params._id; 
	// Extract query parameters
    const { from, to, limit } = req.query; 

	// Initialize query object to filter exercises by user ID
    const query = { userId }; 

    // Parse 'from' date and add to query if valid
    if (from) {
        const fromDate = moment(from, 'YYYY-MM-DD').startOf('day').toDate(); // Ensure start of the day
        if (moment(from, 'YYYY-MM-DD', true).isValid()) {
            query.date = { ...query.date, $gte: fromDate };
            console.log('Valid from date:', fromDate);
        } else {
            console.log('Invalid "from" date:', from);
            return res.status(400).json({ error: 'Invalid "from" date' });
        }
    }

    // Parse 'to' date and add to query if valid
    if (to) {
		// Ensure end of the day
        const toDate = moment(to, 'YYYY-MM-DD').endOf('day').toDate(); 
        if (moment(to, 'YYYY-MM-DD', true).isValid()) {
            query.date = { ...query.date, $lte: toDate };
            console.log('Valid to date:', toDate);
        } else {
            console.log('Invalid "to" date:', to);
            return res.status(400).json({ error: 'Invalid "to" date' });
        }
    }

    console.log('Query:', query);

    try {
        // Fetch exercises that match the query and limit if provided
        const exercises = await Exercise.find(query).limit(parseInt(limit) || 0);
        console.log('Exercises found:', exercises.length);

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            console.log('User not found:', userId);
            return res.status(404).json({ error: 'User not found' }); // Respond with error if user not found
        }

        console.log('User found:', user);

        // Respond with user details and exercise log
        res.json({
            username: user.username,
            count: exercises.length, // Number of exercises
            _id: userId,
            log: exercises.map(({ description, duration, date }) => ({
                description,
                duration,
                date: moment(date).format('ddd MMM DD YYYY'),
            })),
        });
    } catch (error) {
        console.log('Error fetching logs:', error);
        res.status(400).json({ error: error.message }); // Respond with error message
    }
});

// Start the server and listen on a port (from environment variables or default to 3000)
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Server is running on port', listener.address().port);
});
