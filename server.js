const express = require('express')
const app = express()
const bodyParser = require('body-parser')
const shortid = require('shortid')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, {useMongoClient: true})
mongoose.Promise = global.Promise;

var Schema = mongoose.Schema
var LogSchema = new Schema({
      userId: { type: String, ref: 'User' },
      description: {type: String, required: true },
      duration: {type: Number, required: true },
      date: {type: Date, default: Date.now}
});
var Log = mongoose.model('Log', LogSchema);

var UserSchema = new Schema({
  username: {type: String, unique: true, required: true},
  _id: {type: String, default: shortid.generate}
});

var User = mongoose.model('User', UserSchema);

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.use((req,res,next) => {
  const method = req.method;
  const path = req.path;
  const ip = req.ip;
  
  console.log(`${method} ${path} - ${ip}`);
  next();
});

// exercise logger

// Add new user
app.route('/api/exercise/new-user')
    .post((req,res) => {
      console.log(req.body.username);
      var user = new User({
        username: req.body.username
      })
      .save()
      .then(result => {
      res.status(201).json({
        username: result.username,
        _id: result._id
      })
    });
      
});

// Get all users from Database
app.get('/api/exercise/users', (req,res) => {
  User.find()
    .select('username _id')
    .exec()
    .then(data => res.status(200).json(data));
});

// New Exercise Log
app.route('/api/exercise/add')
  .post((req,res) => {
    let { userId, description, duration, date } = req.body;
    if (!userId || !description || !duration) {
       return res.status(400).send('Must include required parameters')
    }
      
    date = date ? new Date(date) : new Date();
    
    User.findById(userId)
        .exec()
        .then(user => {
          if(!user) res.status(404).send('User not found');
          const data = new Log({
            userId: userId,
            description: description,
            duration: duration,
            date: date
          });
          data.save().then(result => {
            res.status(200).json({
              message: 'Exercise logged',
              result: result
            });
          });
    })
    .catch(err => res.status(500).send(err))  
});

// Get specific logs
app.route('/api/exercise/log/:userId?/:from?/:to?/:limit?')
  .get((req,res) => {
    console.log(req.params);
    
    var { userId, from, to, limit } = req.params;
    if (!userId) res.status(400).send('Please specify userId'); // error handle
  
    var query = {};
    query.userId = userId;
    if (from || to ) {
      query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lt = new Date(to);
    }
    limit = limit ? Number(limit) : 0;
  console.log(query);
    //query.date.$lt = to ? new Date(to) : '';
    Log.find(query)
        .sort({date: 1 })
        .limit(limit)
        .exec()
        .then(result => res.json(result));
    
});

// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
