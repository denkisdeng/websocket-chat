var lowdb = {};
exports.lowdb = lowdb;

var low = require('lowdb');
var fs = require("fs");
var path = require("path");

var baseDir = './data/chats.json';
var dir = path.dirname(baseDir);
checkAndCreateDir(dir);

//创建数据库
var DB = low(baseDir, {
    autosave: true, // automatically save database on change (default: true)
    async: true // asyncrhonous write (default: true)
});


//创建表
var CHATS_TABLE = DB("chats");
var SIZE_TABLE = DB("total");

//DB.save('./util/db/data/chats2.json') //复制一个数据库
//delete DB.object.chats; //删除表
//DB.save();

//CHATS_TABLE.size(); //查询表中共多少记录
//CHATS_TABLE.remove({ title: 'low!' })//删除指定数据
//CHATS_TABLE.where({id: DB.object.chats[0].id}) || CHATS_TABLE.find({id: DB.object.chats[0].id}) ; 查询
//CHATS_TABLE.pluck('id') //检索
//CHATS_TABLE.cloneDeep(); //克隆

// 查看数据库所有 console.log(DB.object);//  打出整个数据库内容

// http://ourjs.com/detail/53fc9863cf8959e843000007
//https://github.com/typicode/lowdb#license


//添加数据
lowdb.setItem = function(obj) {
    var osize = CHATS_TABLE.size();
    if (osize >= 140) {
        //删除第一条数据
        removeChats(0);
    }
    if (obj.hasOwnProperty('username')) {
        CHATS_TABLE.push(obj);
        var nsize = CHATS_TABLE.size();
        removeTotal();
        SIZE_TABLE.push({
            size: nsize
        });

    }
};

//删除数据
function removeChats(index) {
    CHATS_TABLE.remove({
        id: DB.object.chats[index].id
    });
}

function removeTotal() {
    if (DB.object.total.length > 0) {
        SIZE_TABLE.remove({
            size: DB.object.total[0].size
        });
    }
}

// 判断目录是否存在，不存在时创建目录
function checkAndCreateDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }
}

// 添加：table.push({userName:"abc",id:"1"});
// 查询：table.find({id:"1"})
// 修改：table.chain().find({id:"1"}).assign({userName:"hehe"});  // 修改比较特殊 需要 添加 chain 和 value  原因不清楚
// 删除：table.remove({id:"1"})

