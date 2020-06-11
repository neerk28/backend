const logger = require('./middleware/logger');
const express = require('express');
const config = require('config');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
// Initialize Firebase App
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://local-parikrama.firebaseio.com"
});

logger.info('Initializing Inventory Management System');
// Initialize express
const app = express();
require('./startup/routes')(app);

exports.app = functions.https.onRequest(app)
