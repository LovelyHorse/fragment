// Core server dependencies
var express = require('express');
var app = express();
var server = require('http').Server(app);
var io = require('socket.io')(server);

// Other dependencies
var cookieParser = require('cookie-parser');
var compress = require('compression');
var favicon = require('serve-favicon');
var session = require('express-session');
var bodyParser = require('body-parser');
var logger = require('morgan');
var errorHandler = require('errorhandler');
var lusca = require('lusca');
var methodOverride = require('method-override');
var _ = require('lodash');
var MongoStore = require('connect-mongo')(session);
var flash = require('express-flash');
var path = require('path');
var mongoose = require('mongoose');
var passport = require('passport');
var expressValidator = require('express-validator');
var assets = require('connect-assets');

// Variables
var chunkCount = 0;

// Controllers (route handlers).
var homeController = require('./controllers/home');
var userController = require('./controllers/user');
var apiController = require('./controllers/api');
var contactController = require('./controllers/contact');
var imageTest = require('./controllers/imageApi');

// API keys and Passport configuration.
var secrets = require('./config/secrets');
var passportConf = require('./config/passport');


// Connect to MongoDB.
mongoose.connect(secrets.db);
mongoose.connection.on('error', function() {
  console.log('MongoDB Connection Error. Please make sure that MongoDB is running.'.red);
  process.exit(1);
});

// Express configuration.
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');
app.use(compress());
app.use(assets({
  paths: ['public/css', 'public/js']
}));
app.use(logger('dev'));
app.use(favicon(path.join(__dirname, 'public/favicon.png')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(methodOverride());
app.use(cookieParser());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: secrets.sessionSecret,
  store: new MongoStore({ url: secrets.db, autoReconnect: true })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca({
  csrf: true,
  xframe: 'SAMEORIGIN',
  xssProtection: true
}));
app.use(function(req, res, next) {
  res.locals.user = req.user;
  next();
});
app.use(function(req, res, next) {
  if (/api/i.test(req.path)) req.session.returnTo = req.path;
  next();
});
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: 31557600000 }));
app.use("/resources/images/100010108939289", express.static(__dirname + '/resources/images/100010108939289'));
app.use("/resources/images/100010191557296", express.static(__dirname + '/resources/images/100010191557296'));
app.use("/resources/images/100010178447644", express.static(__dirname + '/resources/images/100010178447644'));
app.use("/resources/images/100010258245128", express.static(__dirname + '/resources/images/100010258245128'));
app.use("/resources/images/100010199357175", express.static(__dirname + '/resources/images/100010199357175'));
app.use("/resources/images/100010309964275", express.static(__dirname + '/resources/images/100010309964275'));
app.use("/resources/images/100010361852458", express.static(__dirname + '/resources/images/100010361852458'));
app.use("/resources/images/100010295175980", express.static(__dirname + '/resources/images/100010295175980'));
app.use("/resources/images/100010227316389", express.static(__dirname + '/resources/images/100010227316389'));


/**
 * Primary app routes.
 */
app.get('/', homeController.index);
app.get('/login', userController.getLogin);
app.post('/login', userController.postLogin);
app.get('/logout', userController.logout);
app.get('/forgot', userController.getForgot);
app.post('/forgot', userController.postForgot);
app.get('/reset/:token', userController.getReset);
app.post('/reset/:token', userController.postReset);
app.get('/signup', userController.getSignup);
app.post('/signup', userController.postSignup);
app.get('/contact', contactController.getContact);
app.post('/contact', contactController.postContact);
app.get('/account', passportConf.isAuthenticated, userController.getAccount);
app.post('/account/profile', passportConf.isAuthenticated, userController.postUpdateProfile);
app.post('/account/password', passportConf.isAuthenticated, userController.postUpdatePassword);
app.post('/account/delete', passportConf.isAuthenticated, userController.postDeleteAccount);
app.get('/account/unlink/:provider', passportConf.isAuthenticated, userController.getOauthUnlink);

/**
 * API examples routes.
 */
app.get('/ulookup/:id', imageTest.lookup);
app.get('/api', apiController.getApi);
app.get('/api/stripe', apiController.getStripe);
app.post('/api/stripe', apiController.postStripe);
app.get('/api/scraping', apiController.getScraping);
app.get('/api/twilio', apiController.getTwilio);
app.post('/api/twilio', apiController.postTwilio);
app.get('/api/clockwork', apiController.getClockwork);
app.post('/api/clockwork', apiController.postClockwork);
app.get('/api/facebook', passportConf.isAuthenticated, passportConf.isAuthorized, apiController.getFacebook);
app.get('/api/paypal', apiController.getPayPal);
app.get('/api/paypal/success', apiController.getPayPalSuccess);
app.get('/api/paypal/cancel', apiController.getPayPalCancel);
app.get('/api/lob', apiController.getLob);
app.get('/api/bitgo', apiController.getBitGo);
app.post('/api/bitgo', apiController.postBitGo);
app.get('/api/bitcore', apiController.getBitcore);
app.post('/api/bitcore', apiController.postBitcore);


// OAuth authentication routes. (Sign in)
app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email', 'user_location'] }));
app.get('/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/login' }), function(req, res) {
  res.redirect(req.session.returnTo || '/');
});


// Error handler
app.use(errorHandler());

// Start server
server.listen(app.get('port'), function() {
  console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
});

// Start websocket listener (for scan API page)
io.on('connection', function (socket) {
  console.log('a user connected');

  socket.on('webstream', function (data) {
    if (chunkCount > 9) {
      console.log('chunk of 10 scan frames received from client.');
      chunkCount = 0;
    }

    imageTest.postAPI(data, function(user){
      // Return result via below line
      console.log('MEGA SUCCESS! TIME TO RETURN TO FRONTEND.');
      //io.emit('webstream', 'success');
    }, function(){
      // Return result via below line
      io.emit('webstream', 'fail');
    });

    chunkCount++;
  });

  socket.on('disconnect', function(){
    console.log('user disconnected');
  });
});
module.exports = app;
