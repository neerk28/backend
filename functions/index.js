const express = require('express');
const logger = require('./middleware/logger');
const config = require('config');
require('express-async-errors');

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  databaseURL: "https://local-parikrama.firebaseio.com"
});

logger.info('Initializing Inventory Management System');
const app = express();
require('./startup/routes')(app);

process.on('unhandledRejection', (err) => {
    throw err;
})

exports.app = functions.https.onRequest(app)
