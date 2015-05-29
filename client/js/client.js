(function() {
    var docmt = document.compatMode == 'CSS1Compat' ? document.documentElement : document.body,
        webUrl = '10.24.13.71';
    var toSay = '全体成员';
    var loginbox = $('#loginbox');
    var chatbox = $('#chatbox');
    var turnUser = $("#username");
    var turnMsg = $("#content");
    var olCount = $('#onlinecount');
    var showusername = $('#showusername');

    window.CHAT = {
        msgObj: $("#message"),
        prvtObj: $("#private"),
        prvtWrap: $('#privateWrap'),
        screenheight: window.innerHeight ? window.innerHeight : docmt.clientHeight,
        username: null,
        userid: null,
        socket: null,
        oUsers: null,

        //让浏览器滚动条保持在最低部
        scrollToBottom: function() {
            window.scrollTo(0, this.msgObj.height());
        },

        //退出，本例只是一个简单的刷新
        logout: function() {
            //this.socket.disconnect();
            location.href = 'http://' + webUrl + ':8090';
            localStorage.removeItem('loginName');
        },

        //提交聊天消息内容
        submit: function() {
            var content = turnMsg.val();
            if (content != '') {
                var obj = {
                    userid: this.userid,
                    username: this.username,
                    touser: toSay,
                    content: content
                };

                if (obj.username === obj.touser) {
                    alert('自言自语是一种病，赶快寻找小伙伴！');
                    return;
                }
                this.socket.emit('message', obj);
                turnMsg.val('');
            }
            return false;
        },

        genUid: function() {
            return new Date().getTime() + "" + Math.floor(Math.random() * 899 + 100);
        },

        //更新系统消息，本例中在用户加入、退出的时候调用
        updateSysMsg: function(o, action) {
            //当前在线用户列表
            var onlineUsers = o.onlineUsers;
            //当前在线人数
            var onlineCount = o.onlineCount;
            //新加入用户的信息
            var user = o.user;

            //更新在线人数
            var userhtml = '';
            for (key in onlineUsers) {
                if (onlineUsers.hasOwnProperty(key)) {
                    userhtml += '<span>' + key + '</span>';
                }
            }

            olCount[0].innerHTML = '<div id="userList">当前共有 ' + onlineCount + ' 人在线，在线列表：<span>全体成员</span>' + userhtml + '</div>';

            userClick('#userList', onlineUsers);

            //添加系统消息
            var html = '';
            html += '<div class="msg-system system">';
            html += (action == 'login') ? '欢迎 ' + user.username + ' 加入老汪聊天室' : user.userid + ' 退出了聊天室';
            html += '</div>';
            var section = document.createElement('section');
            section.className = 'system';
            section.innerHTML = html;
            this.msgObj.append(section);
            this.scrollToBottom();
        },

        //第一个界面用户提交用户名
        usernameSubmit: function() {
            var username = turnUser.val();
            if (username != "" && username != "全体成员" && username.length <= 10 && reg(username)) {
                turnUser.val('');
                loginbox.hide();
                chatbox.show();
                this.init(username);
                localStorage.setItem('loginName', username);
                return;
            }

            turnUser.val('');
            return alert("请重新输入用户名！");
        },


        init: function(username) {
            this.userid = this.genUid();
            this.username = username;

            showusername.html(this.username);
            this.msgObj.css('min-height', this.screenheight - document.body.clientHeight + this.msgObj.height())
            this.scrollToBottom();


            var newURL = "index.html?isLogin=true";
            history.pushState(null, '', newURL);

            //连接websocket后端服务器
            this.socket = io.connect('ws://' + webUrl + ':8080');

            //告诉服务器端有用户登录
            this.socket.emit('login', {
                userid: this.userid,
                username: this.username
            });

            this.socket.on('isLogin', function(obj) {
                alert(obj);
                location.href = 'http://' + webUrl + ':8090';
                localStorage.removeItem('loginName');
                return;
            });

            //监听新用户登录
            this.socket.on('login', function(o) {
                CHAT.updateSysMsg(o, 'login');
            });

            //监听用户退出
            this.socket.on('logout', function(o) {
                CHAT.updateSysMsg(o, 'logout');
            });

            //监听消息发送
            this.socket.on('all', function(obj) {
                var isme = (obj.username == CHAT.username) ? true : false;
                var contentDiv = '<div>' + obj.content.emotionsToHtml() + '</div>';
                var username = obj.username;
                //var usernameDiv = '<div>' + obj.username + '</div>';

                var section = document.createElement('section');
                if (isme) {
                    section.className = 'user';
                    section.innerHTML = '<span>你对大家说：</span>' + contentDiv ;
                } else {
                    section.className = 'service';
                    section.innerHTML = '<span>' + username + '对大家说：</span>' + contentDiv;
                }
                CHAT.msgObj.append(section);
                CHAT.scrollToBottom();
            });

            this.socket.on('private', function(obj) {
                var isme = (obj.username == CHAT.username) ? true : false;
                var contentDiv = '<div>' + obj.content.emotionsToHtml() + '</div>';
                var username = obj.username;
                var section = document.createElement('section');

                if (isme) {
                    section.className = 'user';
                    section.innerHTML = '<span>你悄悄的对' + obj.touser + '说：</span>' + contentDiv;
                } else {
                    section.className = 'service';
                    section.innerHTML = '<span>' + username + '悄悄的对你说：</span>' + contentDiv;
                }
                CHAT.prvtObj.append(section);
                CHAT.prvtWrap.show();
                CHAT.prvtObj.scrollTop = CHAT.prvtObj.scrollHeight;
            })

            this.socket.on('at', function(obj) {
                var isme = (obj.username == CHAT.username) ? true : false;
                alert(obj.username + '喊你回家吃饭了！')
            })

        }
    };

    //正则符号
    function reg(txt) {
        if (txt.match(/[`~%!@#^=''?~！@#￥……&——‘”“'？*()（），,。.、]/g)) {
            return false;
        }
        return true;
    };

    //通过“回车”提交用户名
    turnUser.on('keydown', function(e) {
        e = e || event;
        if (e.keyCode === 13) {
            CHAT.usernameSubmit();
        }
    });


    //通过“回车”提交信息
    turnMsg.on('keydown', function(e) {
        e = e || event;
        if (e.keyCode === 13) {
            CHAT.submit();
        }
    });

    //用户选择
    function userClick(id, onlineUsers) {
        var dom = $(id).find('span');
        var odom = dom[0];
        for (var i = 0; i < dom.length; i++) {
            dom[i].index = i;
            for (key in onlineUsers) {
                if (key === toSay) {
                    odom = dom[i];
                }
            }
            dom[i].addEventListener('click', function(ele) {
                if (odom) {
                    if (odom === this) {
                        return;
                    }
                    odom.className = '';
                }
                this.className = 'active';
                odom = this;
                toSay = this.innerHTML;
            }, false)
        }
        odom.className = 'active';
    }

    //关闭私聊
    function closedPrivate(closed) {
        var closed = $(closed);
        closed.on('click', function(ele) {
            CHAT.prvtWrap.hide();
        }, false)
    }

    //history监听后退
    window.addEventListener("popstate", function() {
        var currentState = history.state;
    });

    function haveLoginName() {
        var loginName = localStorage.getItem('loginName');
        if (loginName) {
            turnUser.val('');
            loginbox.hide();
            chatbox.show();
            CHAT.init(loginName);
        }
    }

    (function init() {
        var newURL = window.location.href.split('?')[0];
        history.pushState(null, '', newURL);
        haveLoginName();
        closedPrivate('#closed');
        $("#message_face").jqfaceedit({
            txtAreaObj: $('#content'),
            containerObj: $('#input-box'),
            textareaid: 'content'
        });
    })()
})();
