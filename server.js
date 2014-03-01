var express = require('express');
var http = require('http');
var MongoClient = require('mongodb').MongoClient;

var config = require('./config');

var app = new express();
var db;
MongoClient.connect('mongodb://localhost:27017/mars',function (err,dbIN) {
	db = dbIN;
	app.listen(8080);
	console.log('up');
});

function getblock(hash,cb) {
	db.collection('blocks').findOne({_id:hash},function (err,row){
		if (err) console.log(err);
		if (row) cb(row.block);
		else {
			console.log('cache miss',hash);
			rpc('getblock',[hash],function (reply3) {
				db.collection('blocks').insert({_id:hash,block:reply3.result},function (err,row){
					if (err) console.log(err);
					console.log('cached',hash);
				});
				cb(reply3.result);
			});
		}
	});
}
var lastcount = 0;
var cache = null;
function generateStats(blockindex,cb) {
	rpc('getblockhash',[blockindex],function (reply2) {
		var blocks = [];
		function iter() {
			var count = config.avgperiod;
			if (blocks.length > count) {
				var sum = 0;
				for (var x=0; x<count; x++) {
					var a = blocks[x].time;
					var b = blocks[x+1].time;
					console.log(x,b-a);
					sum += b-a;
				}
				cache = { avgtime: sum/count, blocks:blocks };
				console.log(cache,sum,count);
				lastcount = blockindex;
				cb();
			} else {
				getblock(blocks[0].previousblockhash,function (block) {
					blocks.unshift(block);
					iter();
				});
			}
		}
		getblock(reply2.result,function (block) {
			blocks.unshift(block);
			iter();
		});
	});
}
app.configure(function (){});
app.set('view engine','jade');
app.get('/',function (req,res) {
	rpc('getblockcount',[],function (reply) {
		if (reply.result != lastcount) {
			generateStats(reply.result,finish);
		} else finish();
		function finish() {
			console.log(cache.blocks.length);
			res.render('index',{config:config,cache:cache,total:lastcount});
		}
	});
});
function rpc(method,args,cb) {
	var data = new Buffer(JSON.stringify({method:method,jsonrpc:'2.0',id:0,params:args}));
	var req = http.request({headers:{'Content-Type':'application/json','Content-Length':data.length},method:'POST',auth:config.auth,hostname:'127.0.0.1',port:3883,path:'/'},function (res) {
		res.setEncoding('utf8');
		var output = '';
		res.on('data',function (chunk) {
			output += chunk;
		});
		res.on('end',function () {
			cb(JSON.parse(output));
		});
	});
	req.write(data);
	req.end();
}
