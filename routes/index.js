var express = require('express');
var router = express.Router();
var moment = require('moment');

var api = require('./api.js');

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
    if(data[0].isTeacher)
      res.redirect('/teacher');
    else
      res.redirect('/student');
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
