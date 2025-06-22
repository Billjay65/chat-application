'use strict';
require('dotenv').config();

// require custom modules
const routes = require('./routes.js');
const auth = require('./auth.js');

const express = require('express');
const myDB = require('./connection');
const fccTesting = require('./freeCodeCamp/fcctesting.js');
const session = require('express-session');
const passport = require('passport');
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();

const http = require('http').createServer(app);
const io = require('socket.io')(http);
// authenticate with socket.io
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

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
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

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
  
  // keep track of users
  let currentUsers = 0;
  // listen for connections to server
  io.on('connection', socket => {
    console.log('A user has connected');
    ++currentUsers;
    io.emit('user', {
      username: socket.request.user.username,
      currentUsers,
      connected: true
    });
    console.log('A user has connected');
    // this is after athentication with socket.io
    console.log('user ' + socket.request.user.username + ' connected');
    // listen for chat messages emitted by 
    // connected users
    socket.on('chat message', (message) => {
      io.emit('chat message', { username: socket.request.user.username, message });
    });
    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      io.emit('user', {
        username: socket.request.user.username,
        currentUsers,
        connected: false
      });
    });
  });

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

// functions used by authentication with socket.io
function onAuthorizeSuccess(data, accept) {
  console.log('successful connection to socket.io');

  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('failed connection to socket.io:', message);
  accept(null, false);
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('Listening on port ' + PORT);
});
