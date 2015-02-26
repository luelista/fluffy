var app = require('express')();
var httpclient = require('http');
var http = require('http').Server(app);
var io = require('socket.io')(http);
var url = require('url');

var VERSION = Math.floor(Math.random()*1000);

var allowed_host = 'localhost:4242';
//var allowed_host = 'fluffy.luelistan.net';
var port = 4242;

app.use(function(req,res,next) {
  if (req.headers.host != allowed_host) {
    res.redirect('http://' + allowed_host);
  } else {
    next();
  }
});
app.get('/', function(req, res){
  res.sendfile('index.html');
});
app.get('/fluffy.ogg', function(req, res){
  res.sendfile('fluff.ogg');
});
app.get('/fluffy.gif', function(req, res){
  res.sendfile('fluffy.gif');
});
app.get('/text', function(req, res) {
  var x = new Buffer(0);

  var lang = url.parse(req.url, true).query.lang;
  var text = url.parse(req.url, true).query.text;
  var path = require('querystring').stringify({
    'tl': lang,
    'q': text
  });

  httpclient.get({
    host: 'translate.google.com',
    path: '/translate_tts?'+path //+req.arguments.toString()+'&q='
  }, function(response) {
    response.on('data', function(d) {
      x = Buffer.concat([x, d]);
    });

    response.on('end', function(){
      res.writeHead(200, { 'Content-Type': 'audio/mpeg' });
      res.end(x);
      x = new Buffer(0);
    });
  });
});

var clients = {};
function getCount() {
  return Object.keys(clients).length;
}
function onlineNames() {
  var names=[];
  for(var k in clients) names.push(clients[k].nick);
  return names.join(", ");
}
io.on('connection', function(socket){
  var address = socket.handshake.address, addr=address+":"+socket.request.connection.remotePort;
  clients[addr] = { socket: socket, addr: addr, nick: address };
  console.log('* a user connected', addr);
  io.sockets.emit('newuser', address+" online | "+getCount()+" users online", getCount());
  socket.emit('restart', VERSION);
  socket.emit('chat', "Online users: "+onlineNames());
  socket.on('disconnect', function() {
    delete clients[addr];
    io.sockets.emit('newuser', address+" disconnect | "+getCount()+" users online", getCount());
    console.log('* disconnect '+addr);
  });
  socket.on('ping', function(pong) {
	pong();
  });
  socket.on('playall', function(start) {
	io.sockets.emit('play', start);
  });
  socket.on('newnick', function(nick) {
    nick = nick.replace(/[^a-zA-Z0-9_.+*! -]/g, "");
    io.sockets.emit('chat', '* '+clients[addr].nick+' now known as '+nick);
    clients[addr].nick = nick;
  });
  socket.on('seturl', function(url) {
    io.sockets.emit('seturl', url);
    setTimeout(function() {
      io.sockets.emit('play',0);
    }, 1800);
  });
  socket.on('speak', function(text, lang) {
    io.sockets.emit('speak', text, lang);
    setTimeout(function() {
      io.sockets.emit('play',0);
    }, 1800);
  });
  socket.on('chat', function(msg) {
    try {
      if(msg.charAt(0)=="/") {
        var m=msg.split(/ /);
        switch (m[0]) {
        case "/l":
          socket.emit('chat', "Online users: "+onlineNames());
          break;
        case "/vol":
          clients[m[1]].socket.emit('volume', parseFloat(m[2]));
          break;
        }
      } else {
        io.sockets.emit('chat', clients[addr].nick+': '+msg);
        console.log('chat '+clients[addr].nick+': '+msg);
      }
    } catch(Ex) {
      console.log(Ex);
    }
  });
});

http.listen(port, function(){
  console.log('listening on *:'+port);
});


setInterval(function() {
	io.sockets.emit('color', getRandomColor());
}, 10000);

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}
