(function() {
    var docmt = document.compatMode == 'CSS1Compat' ? document.documentElement : document.body;
    var webUrl = '10.24.13.130';
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
        msgRecord: $('#msgRecordWrap'),
        recordBtn: $('#msgRecordBtn'),
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
            var height = this.screenheight - document.body.clientHeight + this.msgObj.height();
            this.msgObj.css('min-height', height);
            this.msgRecord.css('min-height', height - 80);
            this.scrollToBottom();

            this.recordBtn.on('click', function(event) {
                if ($(this).attr('data-load')) {
                    closeMsg();
                    return false;
                }
                ajaxMsgrecord($(this));
                CHAT.msgRecord.find('.msgRecord').css('height', height - 110);
            });


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
                    section.innerHTML = '<span>你对大家说：</span>' + contentDiv;
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

    //加载聊天记录
    function ajaxMsgrecord(ele) {
        $.ajax({
            type: "GET",
            url: 'http://' + webUrl + ':8080/data/db',
            dataType: "json",
            timeout: 10000,
            cache: false,
            success: function(data) {
                var chats = data.chats.reverse();
                var total = data.total[0].size;
                var pagesLen = Math.floor(total / 20);
                var tabs = '';
                var pages = '';
                var tpl = '';
                for (var i = 0; i <= pagesLen; i++) {
                    tabs += '<span>' + (i + 1) + '</span>';
                    pages += '<div class="pages"></div>';
                }
                CHAT.msgRecord.find('.tabs').html(tabs).find('span').eq(0).addClass('curr');
                CHAT.msgRecord.find('.conts').html(pages).find('.pages').eq(0).show();

                chats.forEach(function(o, i) {
                    var page = Math.floor(i / 20);
                    var t = '<div class="t">' + o.username + ' ' + o.time + '</div>';
                    var c = '<div class="c">' + o.content.emotionsToHtml() + '</div>';
                    tpl += t + c;

                    if ((i + 1) % 20 === 0 || (i + 1) === total) {
                        CHAT.msgRecord.find('.conts').find('.pages').eq(page).html(tpl);
                        tpl = '';
                    }
                })

                CHAT.msgRecord.find('.tabs').find('span').on('click', function(event) {
                    $(this).addClass('curr').siblings().removeClass('curr');
                    CHAT.msgRecord.find('.conts').find('.pages').eq($(this).index()).show().siblings().hide();
                    var URL = "?isLogin=true&page=" + ($(this).index() + 1);
                    history.pushState(null, '', URL);
                });
                var URL = "?isLogin=true&page=1";
                history.pushState(null, '', URL);
                ele.attr('data-load', '0');
                CHAT.msgRecord.show();
            },
            error: function(XMLHttpRequest, textStatus, errorThrown) {
                console.log('error');
                // console.log(XMLHttpRequest);
                // console.log(textStatus);
                // console.log(errorThrown);
                // console.log(XMLHttpRequest.readyState);
            }
        });
    }

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
        })
    }

    //关闭聊天记录
    function closedMsgRecord(closed) {
        var closed = $(closed);
        closed.on('click', function(ele) {
            closeMsg();
        })
    }

    function closeMsg() {
        CHAT.msgRecord.hide();
        CHAT.msgRecord.find('.tabs').html('');
        CHAT.msgRecord.find('.conts').html('');
        CHAT.recordBtn.attr('data-load', '');
        var URL = window.location.href.split('?')[0];
        history.pushState(null, '', URL + '?isLogin=true');
    }


    //history监听后退
    var isHistoryApi = !!(window.history && history.pushState);
    if (isHistoryApi) {
        $(window).on("popstate", function(event) {
            fnHistoryPage();
        });
    }

    function fnHistoryPage() {
        var query = location.href.split("?")[1];
        if (query) {
            if (query.indexOf('page') > 0) {
                var pages = query.match(/page=(\d+)/g)[0].split('=')[1];
                CHAT.msgRecord.find('.tabs').find('span').eq(pages-1).addClass('curr').siblings().removeClass('curr');
                CHAT.msgRecord.find('.conts').find('.pages').eq(pages-1).show().siblings().hide();
            }else{
                closeMsg();
            }
        }
    }

    //是否存在缓存用户名
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
        closedPrivate('#privateClosed');
        closedMsgRecord('#msgClosed');
        $("#message_face").jqfaceedit({
            txtAreaObj: $('#content'),
            containerObj: $('#input-box'),
            textareaid: 'content'
        });
    })()


})();
