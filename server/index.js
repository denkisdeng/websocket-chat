var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var uuid = require('uuid');

//跟express集成，可以输出客户端GET 或 POST的url
// var log = require('./log');
// log.use(app);

//日志
var logger = require("./util/log/log").helper;
//logger.writeInfo("用户日志");
//logger.writeDebug("调试");
//logger.writeErr("出错了" , exp);
//logger.writeLogin("登录");
//logger.writeLogout("登出");
//logger.writeChat("聊天信息");

//数据
var db = require("./util/db/db").lowdb;

//在线用户
var onlineUsers = {};
//当前在线人数
var onlineCount = 0;

io.on('connection', function(socket) {
    console.log('=============== a user connected =====================');
    logger.writeInfo("用户成功链接聊天室");

    //监听新用户加入
    socket.on('login', function(obj) {
        //检查在线列表，如果不在里面就加入
        if (!onlineUsers.hasOwnProperty(obj.username) && obj.username != "全体成员" && reg(obj.username)) {
            //将新加入用户的唯一标识当作socket的名称，后面退出的时候会用到
            socket.name = obj.username;

            onlineUsers[obj.username] = [obj.userid, socket.id];
            //在线人数+1
            onlineCount++;

            //向所有客户端广播用户加入
            io.emit('login', {
                onlineUsers: onlineUsers,
                onlineCount: onlineCount,
                user: obj
            });

            //在线用户
            var userList = '';
            var separator = '';
            for (key in onlineUsers) {
                if (onlineUsers.hasOwnProperty(key)) {
                    userList += separator + key;
                    separator = '、';
                }
            }

            logger.writeLogin(obj.username + '登录成功，在线人数：' + onlineCount + " 用户列表：" + userList);
            console.log(obj.username + '加入');
            return;
        } else {
            socket.emit('isLogin', '用户名已存在！');
            console.log('用户名已存在！');
        }
    });

    //监听用户退出
    socket.on('disconnect', function() {
        //将退出的用户从在线列表中删除
        if (onlineUsers.hasOwnProperty(socket.name)) {
            //退出用户的信息
            var obj = {
                userid: socket.name,
                username: onlineUsers[socket.name]
            };

            //删除
            delete onlineUsers[socket.name];
            //在线人数-1
            onlineCount--;

            //向所有客户端广播用户退出
            io.emit('logout', {
                onlineUsers: onlineUsers,
                onlineCount: onlineCount,
                user: obj
            });

            var userList = '';
            var separator = '';
            for (key in onlineUsers) {
                if (onlineUsers.hasOwnProperty(key)) {
                    userList += separator + key;
                    separator = '、';
                }
            }

            logger.writeLogout(obj.userid + '退出，在线人数：' + onlineCount + " 用户列表：" + userList);
            console.log(obj.userid + '退出');
        }
    });

    //监听用户发布聊天内容
    socket.on('message', function(obj) {
        var newObj = {};
        if (obj.content.indexOf('@') >= 0) {
            var userArr = obj.content.match(/@[\u4e00-\u9fa5+\w+]+/g);
        }
        for (var key in userArr) {
            var val = userArr[key].slice(1);
            if (val === '全体成员') {
                socket.broadcast.emit('at', obj);
            } else {
                io.sockets.connected[onlineUsers[val][1]].emit('at', obj);
            }
        }
        if (obj.touser === '全体成员') {
            var username = obj.username;
            var content = obj.content;
            var date = new Date();
            var getDate = getMeta(date);

            newObj['id'] = uuid();
            newObj['username'] = username;
            newObj['content'] = content;
            newObj['time'] = getDate.year + '-' + getDate.month + '-' + getDate.day + ' ' + getDate.hour + ':' + getDate.minute + ':' + getDate.second;

            //newObj.time = time;
            //向所有客户端广播发布的消息
            io.emit('all', obj);
            logger.writeChat(username + '对所有人说：' + content);
            db.setItem(newObj);
            console.log(username + '对所有人说：' + content);
        } else {
            for (key in onlineUsers) {
                if (obj.touser === key) {
                    obj.touserid = onlineUsers[key][0];
                }
            }
            //向指定与自己客户端广播发布的消息
            io.sockets.connected[onlineUsers[obj.touser][1]].emit('private', obj);
            io.sockets.connected[onlineUsers[obj.username][1]].emit('private', obj);
            logger.writeChat(obj.username + '对' + obj.touser + '说：' + obj.content);
            console.log(obj.username + '对' + obj.touser + '说：' + obj.content);
        }
    });

});

function reg(txt) {
    if (txt.match(/[`~%!@#^=''?~！@#￥……&——‘”“'？*()（），,。.、]/g)) {
        return false;
    }
    return true;
}

//获取时间
function getMeta(date) {
    if (!date) {
        return null;
    }
    var YYYY = date.getFullYear(),
        MM = date.getMonth(),
        DD = date.getDate(),
        hh = date.getHours(),
        mm = date.getMinutes(),
        ss = date.getSeconds();
    return {
        year: YYYY,
        month: dbl00(MM + 1),
        day: dbl00(DD),
        hour: dbl00(hh),
        minute: dbl00(mm),
        second: dbl00(ss)
    }
}

function dbl00(num) {
    return num < 10 ? '0' + num : num;
}

app.get('/', function(req, res) {
    res.send('<h1>Welcome</h1>');
});

var urllib = require('url');
var chatsDB = null;

app.all('*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    res.header("Access-Control-Allow-Methods", "PUT,POST,GET,DELETE,OPTIONS");
    res.header("X-Powered-By", ' 3.2.1')
    res.header("Content-Type", "application/json;charset=utf-8");
    next();
});

app.get('/data/db?*', function(req, res) {
    delete require.cache[require.resolve('./data/chats.json')];
    chatsDB = require('./data/chats.json');
    console.log(chatsDB.total[0].size);
    var params = urllib.parse(req.url, true);
    var query = params.query;
    if (query && query.callback) {
        //var str = params.query.callback + '(' + JSON.stringify(chatsDB) + ')'; //jsonp
        res.jsonp(JSON.stringify(chatsDB));
    } else {
        res.send(JSON.stringify(chatsDB)) //普通的json
    }
});




// var port = 8888;
// var urllib = require('url');
// require('http').createServer(function(req, res) {
//     var params = urllib.parse(req.url, true);
//     if (params.query && params.query.callback) {
//         //console.log(params.query.callback);
//         var str = params.query.callback + '(' + JSON.stringify(chatsDB) + ')'; //jsonp
//         console.log(str)
//         res.end(str);
//     } else {
//         res.end(JSON.stringify(chatsDB)); //普通的json
//     }
// }).listen(port, function() {
//     console.log('data is listening on port' + port);
// })


http.listen(8080, function() {
    console.log('server is listening on port ' + 8080);
})
