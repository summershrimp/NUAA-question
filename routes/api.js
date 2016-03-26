var express = require('express');
var router = express.Router();
var app = express();
var moment = require('moment');
var config = require("../config.js");

router.use(function(req, res, next){
    var ok = false;
    if(config.origin[req.get("host")]){
        ok = true;
    }else if(config.origin["*"]){
        ok = true;
    }
    if(ok){
        res.set("Access-Control-Allow-Origin", req.get("host"));
    }
    next();
});





router.get("/question", function(req, res, next){
    var redis = req.redis;
    var pool = req.pool;
    date = moment().format("YYYY-MM-DD");
    redis.ttl("ques:now", function(err, ttl){
        redis.get("ques:now",function(err, data){
            if(data == null){
                res.send({});
                return
            }
            data = JSON.parse(data);
            if(data.type == "question"){
                redis.get("ques:" + date + ":" + data.number, function(err, user){
                    res.send({ttl: ttl, user: user || ""});
                })
            }else if(data.type == "choice"){
                pool.query("select count(*) count from logs where number = ? and date = ?",[data.number, date],function(err, rows){
                    res.send({ttl: ttl, count: rows[0].count});
                });
            }
        });
    });
});

router.post("/answer", function(req, res, next){
    if(!req.session.user){
        res.send({err: "not login"})
        return;
    }
    if(req.session.user){
        if(req.session.user.isTeacher){
            res.send({err: "u are not teacher"});
            return;
        }
    }

    var redis = req.redis;
    var pool = req.pool;
    redis.get("ques:now",function(err, data){
        if(data == null){
            res.send({err: "question is closed"});
            return
        }
        data = JSON.parse(data);
        if(data.type == "question"){
            redis.setnx("ques:" + date +":" + data.number, req.session.user.realname, function(err, ret){
                if(ret){
                    console.log(JSON.stringify({
                        user_id: req.session.user.id,
                        type: data.type,
                        date: date,
                        number: data.number
                    }));
                    pool.query("insert into logs set ?",{
                        user_id: req.session.user.id,
                        type: data.type,
                        date: date,
                        number: data.number
                    }, function(err, rows){
                        res.send({success: rows.insertId});
                    })
                } else {
                    res.send({success: 0})
                }
            })
        }else if(data.type == "choice"){
            if(!req.body.answer){
                res.send({err: "no answer"})
                return;
            }
            pool.query("insert into logs set ?",{
                user_id: req.session.user.id,
                type: data.type,
                answer: req.body.answer,
                date: date,
                number: data.number
            }, function(err, rows){
                if(err){
                    res.send({err: err.message});
                    return ;
                }
                res.send({success: rows.insertId});
            })
        }
    });


});

// catch 404 and forward to error handler
router.use(function(req, res, next) {
    var err = new Error('No api found.');
    err.status = 404;
    next(err);
});

// api error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    router.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.json({
            message: err.message,
            error: err.stack
        });
    });
}

// production error handler
// no stacktraces leaked to user
router.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.json({
        message: err.message,
        error: {}
    });
});

module.exports = router;
