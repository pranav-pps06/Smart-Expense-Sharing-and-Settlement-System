var express = require('express');
require('dotenv').config();
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const cors = require("cors");

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginUser = require('./routes/login');
var newUser = require('./routes/newUser');
var api = require('./routes/api');
var expensesRouter = require('./routes/expenses');
const { connectMongo } = require('./db/mongo');
const mysqlDb = require('./db/sqlconnect');
const bus = require('./events/bus');
const ActivityLog = require('./mongo/ActivityLog');
const Notification = require('./mongo/Notification');
const RealtimeUpdate = require('./mongo/RealtimeUpdate');
require('./events/handlers');

var app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Connect to Mongo (best-effort)
connectMongo().catch((e) => {
  console.error('Mongo connection failed:', e.message);
});

// Expose MySQL connection for routes that need it
app.set('mysql', mysqlDb);

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/newuser', newUser);
app.use('/loginuser', loginUser);
app.use('/api', api);
app.use('/api/expenses', expensesRouter);

module.exports = app;
