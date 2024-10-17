# Exercise Tracker

This is an **Exercise Tracker** application built with **Node.js**, **Express**, and **MongoDB**. It allows users to create accounts, log exercises, and view their exercise history.

## Live Demo

Check out the live demo of the application: [Exercise Tracker Live Demo](https://3000-freecodecam-boilerplate-fiyssqtq38q.ws-us116.gitpod.io)

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (v12 or higher)
- [MongoDB](https://www.mongodb.com/) (either locally or using a service like MongoDB Atlas)

### Installation

Follow these steps to set up the project on your local machine:

1. **Clone the repository:**

   ```sh
   git clone https://github.com/davesheinbein/exercisetracker.git
   cd exercisetracker
   ```

2. **Install dependencies:**

   ```sh
   npm install
   ```

3. **Create a `.env` file in the root directory and add your MongoDB URI:**

   ```env
   MONGO_URI=your_mongodb_uri
   PORT=3000
   ```

   Replace `your_mongodb_uri` with your actual MongoDB connection string.

4. **Start the server:**

   ```sh
   npm start
   ```

5. **Access the application:**
   Open your web browser and navigate to `http://localhost:3000`.

## Features

- **Create New Users:** Users can create an account with a unique username.
- **Log Exercises:** Users can log exercises with a description, duration, and optional date.
- **View Exercise Logs:** Users can view their exercise history with a count of logged exercises.

## Code

For the complete source code, visit: [Exercise Tracker Code Repository](https://github.com/davesheinbein/exercisetracker)

## Technologies Used

- **Node.js**: JavaScript runtime for building the server.
- **Express**: Web framework for Node.js.
- **MongoDB**: NoSQL database for storing user and exercise data.
- **Mongoose**: ODM library for MongoDB and Node.js.
- **Moment.js**: Library for parsing and formatting dates.

