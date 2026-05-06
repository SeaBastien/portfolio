const { MongoClient } = require('mongodb');

// Ensure MongoDB URI exists
if (!process.env.MONGODB_URI) {
  throw new Error('Please add your Mongo URI to .env');
}

const uri = process.env.MONGODB_URI;
const options = {};

let client;
let clientPromise;

// Preserve the MongoClient connection across function executions
if (process.env.NODE_ENV === 'development') {
  if (!global._mongoClientPromise) {
    client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  clientPromise = global._mongoClientPromise;
} else {
  client = new MongoClient(uri, options);
  clientPromise = client.connect();
}

exports.handler = async function (event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' })
    };
  }

  try {
    // Netlify receives the body as a JSON string
    const data = JSON.parse(event.body);
    const { name, email, subject, message } = data;

    // Validate inputs
    if (!email || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Email and Message are required fields.' })
      };
    }

    // Connect to database
    const dbClient = await clientPromise;
    const db = dbClient.db('portfolioDB'); // Name of the database
    const collection = db.collection('messages');

    // Insert message into DB
    const result = await collection.insertOne({
      name: name || 'Anonymous',
      email,
      subject: subject || 'No Subject',
      message,
      createdAt: new Date(),
    });

    return {
      statusCode: 201,
      body: JSON.stringify({ 
        success: true, 
        message: 'Message saved successfully',
        id: result.insertedId 
      })
    };
  } catch (error) {
    console.error('Database Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error' })
    };
  }
};
