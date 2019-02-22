var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');
var WebSocket = require("ws");
var WebSocketServer = require('ws').Server;
var wss = new WebSocketServer({ port: 8088 });

var wsList = [];
var roles = [];
var onlineUsers = [];

wss.on('connection', function (ws) {
  console.log('WS connection established!')
  wsList.push(ws);

  ws.on('close', function () {
    wsList.splice(wsList.indexOf(ws), 1);
    console.log('WS closed!')
  });

  ws.on('message', function (message) {
    console.log('Got ws message: ' + message);
    for (var i = 0; i < wsList.length; i++) {
      // send to everybody on the site
      wsList[i].send(message);
    }
  });
});

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function (err, contents) {
  roles = JSON.parse(contents).roles;
});

//server static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
//bootstrap
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {


  //send roles to clients
  socket.emit('update roles', roles);

  //send the message out
  socket.on('chat message', function (role, msg) {
    socket.broadcast.emit('chat message', role, msg);
  });


  // //set the users and broadcast them to clients
  // if(onlineUsers.includes({username: socket.id}) == false){

  // }
  // // To subscribe the socket to a given channel
  socket.on('join', function (role) {
    //connect to room
    socket.join("test voice");
    onlineUsers.push({ id: socket.id, username: role });

    console.log(onlineUsers);
    console.log("-----------------------------------------------------");
    // socket.emit('onlineUsers', Object.keys(onlineUsers).length);
    socket.emit('onlineUsers', onlineUsers, Object.keys(onlineUsers).length);
  });


  socket.on('voice message', function (stream) {
    console.log(stream);
  });

  // To keep track of online users
  // socket.on('userPresence', function (data) {
  //   onlineUsers[socket.id] = {
  //     username: socket.id
  //   };
  //   socket.emit('onlineUsers', onlineUsers.length);
  // });

  // // For message passing
  // socket.on('message', function (data) {
  //   io.sockets.to(data.toUsername).emit('message', data.data);
  // });

  // socket.on('client-stream-request', function (data) {
  //   var stream = ss.createStream();
  //   var filename = __dirname + '/downloads/' + <YOURSONG.MP3>;
  //   ss(socket).emit('audio-stream', stream, { name: filename });
  //   fs.createReadStream(filename).pipe(stream);
  // });

  socket.on('radio', function (data) {
    socket.broadcast.emit('voice', data.blob);//to(data.url).
    socket.join("data.url");
  });
  
  socket.on('role change', function (role) {
    removeFromUsers(socket.id, role);
  });

  // // To listen for a client's disconnection from server and intimate other clients about the same
  socket.on('disconnect', function (data) {

    removeFromUsers(socket.id, null);

    // socket.broadcast.emit('disconnected', onlineUsers[id]);
    // delete onlineUsers[id];
    // var index = onlineUsers.indexOf(s)
    // console.log(Object.keys(onlineUsers));
    //socket.broadcast.emit('onlineUsers', onlineUsers);
    // socket.broadcast.emit('onlineUsers', Object.keys(onlineUsers).length);
    // var index = findWithAttr(onlineUsers, 'id', socket.id);
    // onlineUsers.splice(index, 1);
    // console.log(index); 
    // socket.broadcast.emit('onlineUsers', onlineUsers, Object.keys(onlineUsers).length);
  });
});

function removeFromUsers(id, safeRole) {
  var result = onlineUsers.filter(obj => {
    return obj.id === id && safeRole !== obj.role
  })

  result.forEach(element => {
    var index = onlineUsers.indexOf(element);
    onlineUsers.splice(index, 1);
  });

  //console.log(onlineUsers);
}

function findWithAttr(array, attr, value) {
  for (var i = 0; i < array.length; i += 1) {
    if (array[i][attr] === value) {
      return i;
    }
  }
  return -1;
}

http.listen(3000, function () {
  console.log('listening on *:3000');
});