var express = require('express')
  , passport = require('passport')
  , app = express()
  , server = require('http').createServer(app)  
  , io = require('socket.io').listen(server)
  , passportSocketIo = require("passport.socketio")
  , flash = require('connect-flash')
  , util = require('util')
  , LocalStrategy = require('passport-local').Strategy
  , RedisStore = require('connect-redis')(express)
  , sessionStore = new RedisStore()
  , redis = require('redis')
  , dbRedis = redis.createClient()
  , sqlite3 = require('sqlite3').verbose()
  , db = new sqlite3.Database('app.db')
  , gpio = require('pi-gpio');

//load users from the database. this can be improved...
var users = [
    { id: 1, username: 'bob', password: 'secret', email: 'bob@example.com' }
  , { id: 2, username: 'joe', password: 'birthday', email: 'joe@example.com' }
];

//alternative to defining users in the program is to get them from the database
//db.each("SELECT id, username, password, email FROM users", function(err, row) {
//  users[row.id-1] = row;
//	
//});
console.log(users);

function findById(id, fn) {
  var idx = id - 1;
  if (users[idx]) {
    fn(null, users[idx]);
  } else {
    fn(new Error('User ' + id + ' does not exist'));
  }
}

function findByUsername(username, fn) {
  for (var i = 0, len = users.length; i < len; i++) {
    var user = users[i];
    if (user.username === username) {
      return fn(null, user);
    }
  }
  return fn(null, null);
}

// Passport session setup.
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session. Typically,
// this will be as simple as storing the user ID when serializing, and finding
// the user by ID when deserializing.
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  findById(id, function (err, user) {
    done(err, user);
  });
});

// Use the LocalStrategy within Passport.
// Strategies in passport require a `verify` function, which accept
// credentials (in this case, a username and password), and invoke a callback
// with a user object. In the real world, this would query a database;
// however, in this example we are using a baked-in set of users.
passport.use(new LocalStrategy(
  function(username, password, done) {
    // asynchronous verification, for effect...
    process.nextTick(function () {
      
      // Find the user by username. If there is no user with the given
      // username, or the password is not correct, set the user to `false` to
      // indicate failure and set a flash message. Otherwise, return the
      // authenticated `user`.
      findByUsername(username, function(err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false, { message: 'Unknown user ' + username }); }
        if (user.password != password) { return done(null, false, { message: 'Invalid password' }); }
        return done(null, user);
      })
    });
  }
));
	
// configure Express
app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.engine('ejs', require('ejs-locals'));
  app.use(express.logger());
  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.session({secret: 'keyboard cat', key: 'express.sid', store: sessionStore}));
  app.use(flash());
  // Initialize Passport! Also use passport.session() middleware, to support
  // persistent login sessions (recommended).
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/../../public'));
});

// routing
app.get('/app.css', function (req, res) {
  res.sendfile(__dirname + '/app.css'); 
});

app.get('/js/bootstrap.min.js', function (req, res) {
  res.sendfile(__dirname + '/js/bootstrap.min.js'); 
});

app.get('/js/connect.js', function (req, res) {
  res.sendfile(__dirname + '/js/connect.js'); 
});

app.get('/js/highcharts.js', function (req, res) {
  res.sendfile(__dirname + '/js/highcharts.js'); 
});

app.get('/js/chart.js', function (req, res) {
  res.sendfile(__dirname + '/js/chart.js'); 
});

app.get('/js/jquery-ui-1.10.0.custom.min.js', function (req, res) {
  res.sendfile(__dirname + '/js/jquery-ui-1.10.0.custom.min.js'); 
});

app.get('/css/bootstrap.min.css', function (req, res) {
  res.sendfile(__dirname + '/css/bootstrap.min.css'); 
});

app.get('/css/bootstrap-responsive.min.css', function (req, res) {
  res.sendfile(__dirname + '/css/bootstrap-responsive.min.css'); 
});

app.get('/css/jquery-ui-1.10.0.custom.css', function (req, res) {
  res.sendfile(__dirname + '/css/jquery-ui-1.10.0.custom.css'); 
});

app.get('/', function(req, res){
  res.render('index', { user: req.user });
});

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.get('/login', function(req, res){
  res.render('login', { user: req.user, message: req.flash('error') });
});

app.get('/socket.io/1/websocket/', function(req, res){
	res.render('login', {user: req.user, message: req.flash('error')});	
	});

// POST /login
// Use passport.authenticate() as route middleware to authenticate the
// request. If authentication fails, the user will be redirected back to the
// login page. Otherwise, the primary route function function will be called,
// which, in this example, will redirect the user to the home page.
//
// curl -v -d "username=bob&password=secret" http://127.0.0.1:3000/login
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login', failureFlash: true }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

server.listen(8080);

// Simple route middleware to ensure user is authenticated.
// Use this route middleware on any resource that needs to be protected. If
// the request is authenticated (typically via a persistent login session),
// the request will proceed. Otherwise, the user will be redirected to the
// login page.
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

// usernames which are currently connected to the chat
var usernames = {};

io.set('authorization', passportSocketIo.authorize({
    sessionKey:    'express.sid',      //the cookie where express (or connect) stores its session id.
    sessionStore:  sessionStore,     //the session store that express uses
    sessionSecret: 'keyboard cat', //the session secret to parse the cookie
    fail: function(data, accept) {     // *optional* callbacks on success or fail
      accept(null, false);             // second param takes boolean on whether or not to allow handshake
      console.info("Fail");
    },
    success: function(data, accept) {
      accept(null, true);
      console.info("Success");
    }
}));

io.sockets.on('connection', function (socket) {
    var hs = socket.handshake;
    console.info('A socket with sessionID ' + hs.address.address 
        + ' connected!');

db.each("SELECT name, command, state FROM valves", function(err, row) {
	if ( row.command == 1) {
			io.sockets.emit('opencmd', socket.username, row.name);	
		} else {
			io.sockets.emit('closecmd', socket.username, row.name);			
			}
	if ( row.state == 1) {
			io.sockets.emit('openvalve', socket.username, row.name);	
		} else {
			io.sockets.emit('closevalve', socket.username, row.name);			
			}
});

// we store the username in the socket session for this client
socket.username = hs.user.username;
// add the client's username to the global list
usernames[hs.user.username] = hs.user.username;
// echo to client they've connected
socket.emit('updatechat', 'SERVER', 'you have connected');
// echo globally (all clients) that a person has connected
socket.broadcast.emit('updatechat', 'SERVER', hs.user.username + ' has connected');
// update the list of users in chat, client-side
io.sockets.emit('updateusers', usernames);

// when the client emits 'sendchat', this listens and executes
socket.on('sendchat', function (data) {
// we tell the client to execute 'updatechat' with 2 parameters
io.sockets.emit('updatechat', socket.username, data);
});

// when the client emits 'opencmd', this listens and executes
socket.on('opencmd', function (data) {
// Add calls to IO here
io.sockets.emit('opencmd', socket.username, data);
db.run("INSERT OR REPLACE INTO valves (name, command, state) VALUES($name, 1, (select state from valves where name = $name))", {
        $name: data
    });
dbRedis.hset(data, "command", "1", redis.print);
setTimeout(function () {
  io.sockets.emit('openvalve', socket.username, data);
  db.run("INSERT OR REPLACE INTO valves (name, command, state) VALUES($name, (select command from valves where name = $name), 1)", {
        $name: data
    });
    dbRedis.hset(data, "state", "1", redis.print);
	gpio.open(16, "output", function(err) {     // Open pin 16 for output
      gpio.write(16, 1, function() {            // Set pin 16 high (1)
          gpio.close(16);                       // Close pin 16
      });
    });
}, 1000)
});

// when the client emits 'closecmd', this listens and executes
socket.on('closecmd', function (data) {
// Add calls to IO here
io.sockets.emit('closecmd', socket.username, data);
db.run("INSERT OR REPLACE INTO valves (name, command, state) VALUES($name, 0, (select state from valves where name = $name))", {
        $name: data
    });
dbRedis.hset(data, "command", "0", redis.print);
setTimeout(function () {
  io.sockets.emit('closevalve', socket.username, data);
    db.run("INSERT OR REPLACE INTO valves (name, command, state) VALUES($name, (select command from valves where name = $name), 0)", {
        $name: data
    });
    dbRedis.hset(data, "state", "0", redis.print);
	gpio.open(16, "output", function(err) {     // Open pin 16 for output
      gpio.write(16, 0, function() {            // Set pin 16 low (0)
          gpio.close(16);                       // Close pin 16
      });
    });	
}, 1000)
});

// when the client emits 'adduser', this listens and executes
socket.on('adduser', function(username){
// we store the username in the socket session for this client
socket.username = username;
// add the client's username to the global list
usernames[username] = username;
// echo to client they've connected
socket.emit('updatechat', 'SERVER', 'you have connected');
// echo globally (all clients) that a person has connected
socket.broadcast.emit('updatechat', 'SERVER', username + ' has connected');
// update the list of users in chat, client-side
io.sockets.emit('updateusers', usernames);
});

// when the user disconnects.. perform this
socket.on('disconnect', function(){
// remove the username from global usernames list
delete usernames[socket.username];
// update list of users in chat, client-side
io.sockets.emit('updateusers', usernames);
// echo globally that this client has left
socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
});

// when the client emits 'updatechart', this listens and executes
socket.on('analog', function (data, id) {
// Add calls to IO here
console.log("analog: " + data + " : " + id);
dbRedis.hset(id, "analog", String(data), redis.print);
});

});

setInterval(function () {
var MYtime = new Date().getTime();
var point = Math.random()*100;
  io.sockets.emit('updatechart', point, MYtime);
}, 2000)
