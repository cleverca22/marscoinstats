var express = require('express');
var http = require('http');

var config = require('./config');
console.log(config);


var app = new express();
app.configure(function (){});
app.set('view engine','jade');
app.get('/',function (req,res) {
	rpc('getblockcount',[],function (reply) {
		rpc('getblockhash',[reply.result],function (reply2) {
			rpc('getblock',[reply2.result],function (reply3) {
				rpc('getblock',[reply3.result.previousblockhash],function (reply4) {
					console.log(reply3.result);
					console.log(reply4.result);
					res.render('index',{blocks:reply.result,config:config,lastblock:reply3.result,secondlast:reply4.result});
				});
			});
		});
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
app.listen(8080);
