'use strict';
require('dotenv').config();

// require custom modules
const routes = require('./routes.js');
const auth = require('./auth.js');

const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const http = require('http').createServer(app);
const io = require('socket.io')(http);

const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

// add origin and credentials to handle logout cookies
// this helped pass the test: Registration of New Users
app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like from Postman or FCC test iframe)
    if (!origin) return callback(null, true);
    return callback(null, origin);
  },
  credentials: true
}));

fccTesting(app); //For FCC testing purposes
app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// set up express app to use the session
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false }
}));

// assign pug as the view engine property's value
app.set('view engine', 'pug');
// set the views property to ./views/pug
app.set('views', './views/pug')

// connect to database before listening to requests
myDB(async client => {
  const myDataBase = await client.db('fcc-advanced-node').collection('users');
  
  // instantiate modules
  routes(app, myDataBase);
  auth(app, myDataBase);

  // page not found error server api
  app.use((req, res, next) => {
    res.status(404)
      .type('text')
      .send('Not Found');
  });
}).catch(e => {
  app.route('/').get((req, res) => {
    res.render('index', { title: e, message: 'Unable to connect to database' });
  });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
