var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');
var roles = [];

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function (err, contents) {
  roles = JSON.parse(contents).roles;
});

//server static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function (socket) {
  //read the admin file on connect
  roles.forEach(function (entry) {
    socket.emit('update role', entry);
  });

  //send the message out
  socket.on('chat message', function (role, msg) {
    socket.broadcast.emit('chat message', role, msg);
  });
});

http.listen(3000, function () {
  console.log('listening on *:3000');
});