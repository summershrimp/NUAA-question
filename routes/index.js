var express = require('express');
var router = express.Router();
var moment = require('moment');

var api = require('./api.js');

var building2Location = {
  lat:31.939905,
  long:118.784472
}

function calcDistance(lat, long){
  var dist_long = 102834.74258026089786013677476285;
  var dist_lat = 111712.69150641055729984301412873;
  var x = Math.abs(building2Location.lat - lat) * dist_lat;
  var y = Math.abs(building2Location.long - long) * dist_long;
  return Math.sqrt(x*x + y*y);

}

router.use('/api', api);

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/login')
});


router.get('/logout', function(req, res, next) {
  req.session.user = undefined;
  res.redirect('/login')
});

router.get('/login', function(req, res, next) {
  if(req.session.user){
    if(req.session.user.isTeacher)
      res.redirect('/teacher');
    else
      res.redirect('/student');

    return;
  }
  res.render('login', { title: '登陆', nologout: true });
});


router.post('/login', function(req, res, next) {
  if(!(req.body.username && req.body.password)) {
    res.render('login', {
      title: '登陆',
      empty: "empty",
      nologout: true
    });
    return;
  }
  req.pool.query("Select * from users where username = ? LIMIT 1", [req.body.username], function(err, data){
    if(!data[0] || data[0].password != req.body.password){

      res.render('login', {
        title: '登陆',
        empty: "empty",
        nologout: true
      });
      return;
    }
    req.session.user = data[0];
    var coords = {}
    try{
      coords = JSON.parse(req.body.location);
    } catch (e){
      //ignore
    }
    req.pool.query("Insert into logins Set ? ", {
      longitude: coords.longitude,
      latitude: coords.latitude,
      accuracy: coords.accuracy,
      distance: coords.distance,
      calc_distance: calcDistance(coords.latitude, coords.longitude),
      user_id: req.session.user.id,
      timestamp: moment().format("YYYY-MM-DD hh:mm:ss")
    }, function(err){
      if(data[0].isTeacher)
        res.redirect('/teacher');
      else
        res.redirect('/student');
    });
  });
});

router.get('/student',function(req, res, next) {
  if (!req.session.user) {
    res.redirect('/login');
    return;
  }
  if (req.session.user) {
    if (req.session.user.isTeacher) {
      res.redirect('/teacher');
      return;
    }
  }
  res.render('student');
});

router.get('/teacher',function(req, res, next){
  if(!req.session.user){
    res.redirect('/login');
    return;
  }
  if(req.session.user){
    if(!req.session.user.isTeacher){
      res.redirect('/student');
      return;
    }
  }
  redis = req.redis;
  date = moment().format("YYYY-MM-DD");
  redis.get('ques:'+date, function(err, data){
    if(data == null){
      redis.set('ques:'+date, 0);
      data = 0;
    }
    res.render('teacher',{
      title: '当前状态',
      date: date,
      count: data
    });
  });
});


router.get('/new',function(req, res, next){
  if(!req.session.user){
    res.redirect('/login');
    return;
  }
  if(req.session.user){
    if(!req.session.user.isTeacher){
      res.redirect('/student');
      return;
    }
  }

  if(!req.query.type ){
    res.redirect('/teacher');
    return;
  }

  redis = req.redis;
  date = moment().format("YYYY-MM-DD");
  redis.get('ques:'+date, function(err, data){
    console.log(data);
    if(data == null){
      data = 0;
    }
    ++data;
    var ttl = 300;
    if(req.query.type == "choice")
      ttl = 30;
    redis.setex("ques:now", ttl ,JSON.stringify({
      number:data,
      type: req.query.type
    }));
    redis.set('ques:'+date, data);
    res.redirect('/question');
  });
});


router.get('/question', function(req, res, next){
  if(!req.session.user){
    res.redirect('/login');
    return;
  }
  if(req.session.user){
    if(!req.session.user.isTeacher){
      res.redirect('/student');
      return;
    }
  }

  res.render('question');
});


router.get('/end', function(req, res, next){
  if(!req.session.user){
    res.redirect('/login');
    return;
  }
  if(req.session.user){
    if(!req.session.user.isTeacher){
      res.redirect('/student');
      return;
    }
  }

  var redis = req.redis;
  redis.del("ques:now", function(){
    res.redirect("/teacher");
  })
});

module.exports = router;
