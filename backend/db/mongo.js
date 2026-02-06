const mongoose = require('mongoose');

let isConnected = false;
let connectingPromise = null;

async function connectMongo() {
  if (isConnected) return mongoose;
  if (connectingPromise) return connectingPromise;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('MONGO_URI not set; Mongo features will be disabled');
    return mongoose;
  }
  mongoose.set('strictQuery', true);
  connectingPromise = mongoose
    .connect(uri, { dbName: process.env.MONGO_DB || undefined, serverSelectionTimeoutMS: 5000, family: 4 })
    .then((conn) => {
      isConnected = true;
      connectingPromise = null;
      console.log('MongoDB connected');
      return conn;
    })
    .catch((e) => {
      connectingPromise = null;
      isConnected = false;
      throw e;
    });
  return connectingPromise;
}

module.exports = { mongoose, connectMongo };
