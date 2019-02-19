var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var roles =[];

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function(err, contents) {
    roles = JSON.parse(contents).roles;
});

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

io.on('connection', function(socket){
    //read the admin file on connect
    roles.forEach(function(entry) {
        socket.emit('update role', entry);
    });

    //send the message out
    socket.on('chat message', function(role, msg){
        io.emit('chat message', role + " " + timeNow(), msg);
    });
});

http.listen(3000, function(){
  console.log('listening on *:3000');
});


function timeNow() {
    var d = new Date(),
      h = (d.getHours()<10?'0':'') + d.getHours(),
      m = (d.getMinutes()<10?'0':'') + d.getMinutes();
    return h + ':' + m + ': ';
}