var express = require('express');
var http = require('http');
var MongoClient = require('mongodb').MongoClient;
var async = require('async');

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
	var blocks = {};
	function makeOff(offset) {
		return function (cb) {
			rpc('getblockhash',[blockindex - offset],function (reply2) {
				getblock(reply2.result,function (block) {
					blocks['o'+offset] = block;
					cb();
				});
			});
		};
	}
	async.parallel([
		makeOff(0),
		makeOff(10),
		makeOff(100)
	],function () {
		cache = blocks;
		cache.tenavg = (cache.o0.time - cache.o10.time)/10;
		cache.hunavg = (cache.o0.time - cache.o100.time)/100;
		lastcount = blockindex;
		cb();
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
			console.log(cache);
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
