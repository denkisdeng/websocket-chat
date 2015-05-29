var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
    res.send('<h1>Welcome 多人聊天室</h1>');
});

//跟express集成，可以输出客户端GET 或 POST的url
// var log = require('./log');
// log.use(app);

//日志
var logger = require("./log").helper;
//logger.writeInfo("用户日志");
//logger.writeDebug("调试");
//logger.writeErr("出错了" , exp);
//logger.writeLogin("登录");
//logger.writeLogout("登出");
//logger.writeChat("聊天信息");


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
            //向所有客户端广播发布的消息
            io.emit('all', obj);
            logger.writeChat(obj.username + '对所有人说：' + obj.content);
            console.log(obj.username + '对所有人说：' + obj.content);
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
http.listen(8080, function() {
    console.log('listening on *:8080');
});
