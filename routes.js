const passport = require('passport');
const bcrypt = require('bcrypt');

module.exports = function (app, myDataBase) {
  app.use(passport.initialize());
  app.use(passport.session());

  app.route('/').get((req, res) => {
    res.render('index', {
      title: 'Connected to Database',
      message: 'Please log in',
      showLogin: true,
      showRegistration: true,
      showSocialAuth: true
    });
  });

  /*
  // authentication api endpoint server
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/profile');
  });
  */
  // use amzi, amzi for loggin in and testing
  app.route('/login').post((req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        console.log('Login failed');
        return res.redirect('/');
      }
      req.logIn(user, err => {
        if (err) return next(err);
        console.log('Login successful for:', user.username);
        return res.redirect('/profile');
      });
    })(req, res, next);
  });

  // user /profile route api endpoint server
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    // for debugging purposes
    console.log('req.user:', req.user);
    res.render('profile', {
      username: req.user.username
    });
  })

  // user log out route api endpoint
  // user log out route api endpoint
  app.route('/logout')
    .get((req, res) => {
      req.logout();
      console.log("Attempted logout!")
      res.redirect('/');
    });


  // user registration api endpoint
  /*
  // summary of code below
  app.route('/register').post(
  (req, res, next) => { // check/create user, then next() },
  passport.authenticate('local', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/profile');
  }
  );*/
  app.route('/register')
    .post((req, res, next) => {
      // hash submitted password
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, (err, user) => {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({
            username: req.body.username,
            password: hash
          },
            (err, doc) => {
              if (err) {
                res.redirect('/');
              } else {
                // The inserted document is held within
                // the ops property of the doc
                // next(null, doc.ops[0]);
                /*** MyVersion  ***/
                myDataBase.findOne({ _id: doc.insertedId }, (err, newUser) => {
                  if (err) return res.redirect('/');
                  next(null, newUser);
                });
              }
            }
          )
        }
      })
    },
      passport.authenticate('local', { failureRedirect: '/' }),
      (req, res, next) => {
        res.redirect('/profile');
      }
    );

  app.route('/auth/github')
    .get(passport.authenticate('github'));

  app.route('/auth/github/callback')
    .get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
      req.session.user_id = req.user.id
      res.redirect('/chat');
    });

  app.route('/chat')
    .get(ensureAuthenticated, (req, res) => {
      res.render('chat', {
        user: req.user
      });
    });

  // authentication middleware function
  // always place this below the database connection
  function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect('/');
  };

}