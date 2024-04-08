var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require('cors')

var indexRouter = require('./routes/index');
var apiRouter = require('./routes/api');


var app = express();

// Set up Middleware
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors())
app.use('/', indexRouter);
app.use('/api', apiRouter);

//404 Handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};  
  res.status(err.status || 500);
  res.render('error');
});

//測試用(cron)
// weather_job1.fetchData(job1_week_city_url, 'city', './data/weather_city.json');
// weather_job2.fetchData(job2_week_town_url, 'town', './data/weather_town.json');
// weather_current_job1.fetchData([job1_current_url,job1_current_second_url],'none','./data/weather_current.json')

module.exports = app;
