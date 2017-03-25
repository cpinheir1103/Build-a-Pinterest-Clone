////////// TWITTER/PASSPORT  //////////////////////
// set up twitter passport for oauth
// see https://github.com/jaredhanson/passport-twitter
var passport = require('passport');
var TwitterStrategy = require('passport-twitter').Strategy;
var twitterAPI = require('node-twitter-api');
var twitter = new twitterAPI({
    consumerKey: process.env.TWITTER_CONSUMER_KEY,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    callback: process.env.TWITTER_CALLBACK_URL
});

// the process.env values are set in .env
passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: process.env.TWITTER_CALLBACK_URL,
},
function(token, tokenSecret, profile, cb) {
  return cb(null, profile);
}));
passport.serializeUser(function(user, done) {
  done(null, user);
});
passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


/////////////// INIT //////////////////////
var express = require('express');
var bodyParser = require('body-parser');
var expressSession = require('express-session');
var cookieParser = require('cookie-parser');
var app = express();


app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(expressSession({secret: 'isdfhvisdbisdvhi'}));
app.use(passport.initialize());
app.use(passport.session());
var util = require('util');



/////// FOR SQLITE3   /////////
var sqlite3 = require("sqlite3").verbose();
var fs = require("fs");
var file = "new.db"; 
var exists = fs.existsSync(file);
console.log("exists=" + exists);
var db = new sqlite3.Database(file);
console.log("db=" + db);
//////// FOR EJS //////////
app.engine('.html', require('ejs').__express);
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
//////////////////////////

var pickeduser = "";

////// DATABASE /////////////////////////////////////////////////////////
if (false) {
  db.serialize(function() {
    //db.run("DROP TABLE pics");
    //db.run("DROP TABLE requests");
    //db.run("DROP TABLE users");
    //console.log("DROPPING TABLE!");
    //db.run("CREATE TABLE pics ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, picURL TEXT, desc TEXT, owner INTEGER)");
    //db.run("CREATE TABLE requests ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, bookID INTEGER, reqBy INTEGER, approved INTEGER)");
    //db.run("CREATE TABLE users ( ID	INTEGER PRIMARY KEY AUTOINCREMENT UNIQUE, username TEXT, password TEXT, email TEXT, name TEXT, city TEXT, state TEXT)");  
    console.log("CREATING TABLE!");
  });
}

if (false) {
  db.each("select name from sqlite_master where type='table'", function (err, table) {
          console.log(table);
  });
}


function saveAcctInfo(rb) {
  db.serialize(function() {
    var stmt = db.prepare("UPDATE users SET password = ?, city = ?, name = ?, email = ?, state = ? WHERE username = '" + rb.username + "'");
    stmt.run(rb.password, rb.city, rb.name, rb.email, rb.state);  
    stmt.finalize();
  });
   
  showTable("users");
}

function procRegister(rb) {
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO users(username, password, city, name, email, state) VALUES(?,?,?,?,?,?)");
    stmt.run(rb.username, rb.password, rb.city, rb.name, rb.email, rb.state);  
    stmt.finalize();
  });
   
  showTable("users");
}

function procLogin(req, res) {
  //console.log("req.body.username=" + req.body.username); 
  //console.log("req.body.password=" + req.body.password); 
  db.each("SELECT * FROM users where username = '" + req.body.username + "' and password = '" + req.body.password + "'", 
    function(err, row) { 
      //console.log("row.username=" + row.username); 
      req.session.authuser = row.username;
      req.session.authcity = row.city;
    },
      function complete(err, found) {
        //res.status(500).send({error: 'you have an error'}); 
        if (req.session.authuser === undefined) {
          res.writeHead(500, {"Content-Type": "application/json"});
          res.end();
        }
        else  
        {
          //res.writeHead(200, {"Content-Type": "application/json"});
          res.end('{"success" : "Updated Successfully", "status" : 200}');
        }
        
  });
  
}

function newEventRec(req, res) {
  console.log("newEventRec");
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO events(name, owner) VALUES(?,?)");
    stmt.run(req.body.title, req.session.authuser);
    stmt.finalize();
  });
  
  showTable("events");
}

function delEventRec(req, res) {
  console.log("delEventRec");
  db.serialize(function() {
    var stmt = db.prepare("DELETE FROM events where name='" + req.body.title + "' and owner='" + req.session.authuser + "'");
    stmt.run();
    stmt.finalize();
  });
  
  showTable("events");
}

function procNewPic(req, res) {  
  console.log("procNewPic");
  db.serialize(function() {
    var stmt = db.prepare("INSERT INTO pics(picURL, desc, owner) VALUES(?,?,?)");
    stmt.run(req.body.picURL, req.body.desc, req.session.authuser);
    stmt.finalize();
  });
  
  showTable("pics");  
}
  
function procDelPic(req, res) {  
  console.log("procReqBook");
  db.serialize(function() {
    var stmt = db.prepare("DELETE FROM pics WHERE ID = ?");
    stmt.run(req.body.id);
    stmt.finalize();
  });
  
  showTable("requests");  
}

function procApproveReq(req, res) {  
  console.log("procApproveReq");
  db.serialize(function() {
    var stmt = db.prepare("UPDATE requests SET approved = 1 WHERE ID = " + req.body.id);
    stmt.run();
    stmt.finalize();
  });

  showTable("requests");  
}

function showTable(tbl) {
  db.serialize(function(url) {
    db.each("SELECT * FROM " + tbl, function(err, row) {
      console.log(row);
    });
  });
}

function getMyAcctRec(req, res) {
  var retArr = [];
  console.log("in getMyAcctRec ()");
  db.each("SELECT * FROM users where username = '" + req.session.authuser + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "username": row.username, "password": row.password, "email": row.email, "name": row.name, "city": row.city, "state": row.state  });
      console.log("row=" + JSON.stringify(row));
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

function getAllPicRecs(req, res) {
  var retArr = [];
  console.log("in getAllPicRecs ()");
  db.each("SELECT * FROM pics", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "desc": row.desc, "owner": row.owner  });
      console.log(row.ID + ": " + row.picURL);
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

function getUserPicRecs(req, res) {
  var retArr = [];
  console.log("in getMyPicRecs ()");
  db.each("SELECT * FROM pics where owner = '" + req.body.username + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "desc": row.desc, "owner": row.owner  });
      console.log(row.ID + ": " + row.picURL);
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

function getMyPicRecs(req, res) {
  var retArr = [];
  console.log("in getMyPicRecs ()");
  db.each("SELECT * FROM pics where owner = '" + req.session.authuser + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "desc": row.desc, "owner": row.owner  });
      console.log(row.ID + ": " + row.picURL);
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

function getRequestForMeRecs(req, res) {
  var retArr = [];
  console.log("in getRequestForMeRecs ()");
  db.each("SELECT * FROM books INNER JOIN requests ON books.ID = requests.bookID where owner = '" + req.session.authuser + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "owner": row.owner, "approved": row.approved, "bookID": row.bookID  });
      console.log("row=" + JSON.stringify(row));
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
  
}

function getMyRequestRecs(req, res) {
  var retArr = [];
  console.log("in getMyRequestRecs ()");
  db.each("SELECT * FROM books INNER JOIN requests ON books.ID = requests.bookID where reqBy = '" + req.session.authuser + "'", function(err, row) { 
      retArr.push({ "ID": row.ID, "picURL": row.picURL, "owner": row.owner, "approved": row.approved  });
      console.log("row=" + JSON.stringify(row));
    },
      function complete(err, found) {
        res.writeHead(200, {"Content-Type": "application/json"});
        res.write(JSON.stringify(retArr)); 
        res.end();
  });
}

////// ROUTING ///////////////////////////////////////////////////////////////////
var screenname = undefined;

app.get("/", function (req, res) {
  //req.session.authuser = undefined;          // temporarily hardcode no logged in user. 
  //req.session.authuser = "cpinheir";  // temporarily hardcode a logged in user. 
  console.log("index req.session.authuser=" + req.session.authuser);
  
  //res.redirect('/listpolls');
  
  res.render('index', {   
        authuser: req.session.authuser,
        pickeduser: pickeduser
      });
});

app.get("/index", function (req, res) {
  res.redirect('/');
});

app.get('/mypics', function(req, res) {
   if (req.session.authuser === undefined) {
     res.redirect('/');
   }
   else {
      res.render('mypics', {   
        authuser: req.session.authuser
      });
   }
});

app.get('/myrequests', function(req, res) {
   if (req.session.authuser === undefined) {
     res.render('/', {   
       authuser: req.session.authuser
     });
   }
   else {
      res.render('myrequests', {   
        authuser: req.session.authuser
      });
   }
});

app.get('/getRequestsForMe', function(req, res) {
  getRequestForMeRecs(req, res);
});

app.get('/getMyRequests', function(req, res) {
  getMyRequestRecs(req, res);
});

app.get('/getMyPics', function(req, res) {
  getMyPicRecs(req, res);
});

app.get('/getAllPics', function(req, res) {
  pickeduser = "";
  getAllPicRecs(req, res);
});

app.get('/getmyacct', function(req, res) {
  getMyAcctRec(req, res);
});

app.post('/gotouserpics', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    //console.log("util.inspect(req)=" + util.inspect(req));
    //procNewPic(req, res);  
    pickeduser = req.body.username;
    getUserPicRecs(req, res);
});

app.post('/newpic', function(req,res){
    console.log(req.body);
    console.log("picURL=" + req.body.picURL);
    //console.log("util.inspect(req)=" + util.inspect(req));
    procNewPic(req, res);   
});

app.post('/approvereq', function(req,res){
    console.log(req.body);
    console.log("id=" + req.body.id);
    procApproveReq(req, res);   
});

app.post('/deletepic', function(req,res){
    console.log(req.body);
    console.log("id=" + req.body.id);
    procDelPic(req, res);   
});

app.post('/saveacct', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    saveAcctInfo(req.body);    
    res.end('{"success" : "Updated Successfully", "status" : 200}');
});

app.post('/procregister', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    procRegister(req.body);    
    res.end('{"success" : "Updated Successfully", "status" : 200}');
});

app.post('/proclogin', function(req,res){
    console.log(req.body);
    console.log("username=" + req.body.username);
    procLogin(req, res);    
});

app.get('/myacct', function(req, res) { 
  res.render('myacct', {   
    authuser: req.session.authuser
  });
})

app.get('/register', function(req, res) { 
  res.render('register', {   
    authuser: req.session.authuser
  });
})

app.get('/login', function(req, res) { 
  res.render('login', {   
    authuser: req.session.authuser
  });
})

app.get('/logout', function(req, res) {
  res.clearCookie('twitter-passport-example');
  
  req.session.authuser = undefined;
  req.session.authcity = undefined;
  
  res.render('index', {   
    authuser: req.session.authuser,
    authcity: req.session.authcity
  });
})


app.get('/test', function(req, res) {
    console.log('GET:....slow url is responding');
    var retObj = { "test" : "cool" };
    //res.write(retObj);
    res.send(retObj);
    //res.sendStatus(200);

})

app.get('/testEJS', function(req, res) {
  res.render('testEJS', {   
    title: "EJS example",
    supplies: [ "fork", "knife", "spoon"]
  });
});

/////////////////AUTHENTICATION ROUTES ////////////////////////
app.get('/auth/twitter', passport.authenticate('twitter'));

app.get('/login/twitter/return', 
  passport.authenticate('twitter', 
    { successRedirect: '/setcookie', failureRedirect: '/' }
  )
);

// on successful auth, a cookie is set before redirecting
// to the success view
app.get('/setcookie',
  function(req, res) {
    //console.log("setcookie req=" + JSON.stringify(req.body));
    //console.log("setcookie res=" + util.inspect(res));
    //console.log("setcookie req sessions=" + util.inspect(req.session));
  
    console.log("req.session['oauth:twitter'].oauth_token=" + req.session['oauth:twitter'].oauth_token); 
    console.log("req.session['oauth:twitter'].oauth_token_secret=" + req.session['oauth:twitter'].oauth_token_secret); 
    console.log("req.query.oauth_verifier=" + req.query.oauth_verifier); 
  
    var requestToken = req.session['oauth:twitter'].oauth_token;
    var requestTokenSecret = req.session['oauth:twitter'].oauth_token_secret;
    var oauth_verifier = req.query.oauth_verifier;
    screenname = undefined;
  
    twitter.getAccessToken(requestToken, requestTokenSecret, oauth_verifier, function(error, accessToken, accessTokenSecret, results) {
      if (error) {
          console.log(error);
      } else {
          //store accessToken and accessTokenSecret somewhere (associated to the user) 
          //Step 4: Verify Credentials belongs here 
          twitter.verifyCredentials(accessToken, accessTokenSecret, function(error, data, response) {
            if (error) {
                //something was wrong with either accessToken or accessTokenSecret 
                //start over with Step 1 
            } else {
                //accessToken and accessTokenSecret can now be used to make api-calls (not yet implemented) 
                //data contains the user-data described in the official Twitter-API-docs 
                //you could e.g. display his screen_name 
                console.log("TWITTER SCREEN NAME=" + data["screen_name"]);
                screenname = data["screen_name"];
                
                res.cookie('twitter-passport-example', new Date());
                res.redirect('/success');
            }
          });
        
      }
    });
  
    //res.cookie('twitter-passport-example', new Date());
    //res.redirect('/success');
  }
);

// if cookie exists, success. otherwise, user is redirected to index
app.get('/success',
  function(req, res) {
    req.session.authuser = screenname;
    if(req.cookies['twitter-passport-example']) {
      //res.sendFile(__dirname + '/views/success.html');
      res.redirect('/mypics');
    } else {
      res.redirect('/');
    }
  }
);

// listen for requests :)
app.listen(8080);