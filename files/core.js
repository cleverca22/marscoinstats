var socket = io.connect('http://mars.stats.angeldsis.com:8080');
function $(id) {
	return document.getElementById(id);
}
socket.on('block',function (hash,block,cache,retarget) {
	console.log('new block',hash,block,cache);
	$('total').textContent = cache.o0.height;
	$('retarget').textContent = retarget;
	$('last').textContent = new Date(cache.o0.time*1000);
	$('age').textContent = Math.floor((Date.now()/1000) - cache.o0.time);
	age = cache.o0.time;
	$('avg10').textContent = cache.tenavg;
	$('avg100').textContent = cache.hunavg;
	$('avg721').textContent = cache.goalavg;
	$('time10').textContent = Math.floor((retarget * cache.tenavg)/3600);
	$('time100').textContent = Math.floor((retarget * cache.hunavg)/3600);
	$('time721').textContent = Math.floor((retarget * cache.goalavg)/3600);
	
	$('log').textContent += (new Date())+' lag:'+Math.floor(((Date.now()-cal)/1000)-cache.o0.time)+'s time:'+(cache.o0.time - cache.o1.time)+'s '+retarget+' blocks and '+$('time10').textContent+'/'+$('time100').textContent+'/'+$('time721').textContent+' hours until retarget\n';
});
function init() {
	setInterval(tick,1000);
}
function tick() {
	var now = Date.now() - cal;
	$('age').textContent = Math.floor((now/1000)-age);
}
