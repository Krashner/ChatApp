var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');
var roles = [];
var onlineUsers = [];


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

  //connect to room
  socket.join("test voice");

  //read the admin file on connect
  roles.forEach(function (entry) {
    socket.emit('update role', entry);
  });

  //send the message out
  socket.on('chat message', function (role, msg) {
    socket.broadcast.emit('chat message', role, msg);
  });

  //voice stuff
  // onlineUsers.push(socket);


  // // To subscribe the socket to a given channel
  // socket.on('join', function (data) {
  //   onlineUsers(socket);
  //   // socket.join("test room");
  // });

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

  // // To listen for a client's disconnection from server and intimate other clients about the same
  // socket.on('disconnect', function (data) {
  //   socket.broadcast.emit('disconnected', onlineUsers[socket.id]);

  //   delete onlineUsers[socket.id];
  //   socket.broadcast.emit('onlineUsers', onlineUsers);
  // });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});