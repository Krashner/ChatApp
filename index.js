var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');

var roles = [];
var connectedSockets = [];


//server static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
//bootstrap js
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap'));
//jquery
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
//simple peer
app.use('/simple-peer', express.static(__dirname + '/node_modules/simple-peer'));
//font awesome
app.use('/font-awesome', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function(err, contents) {
    roles = JSON.parse(contents).roles;
});

//on socket connection
io.on('connection', function(socket) {

    //add socket to array
    connectedSockets.push(socket);

    //give this socket a initiator peer for every connected socket except one with their ID
    for (var i = 0; i < connectedSockets.length; i++) {
        if (socket.id !== connectedSockets[i].id) {
            socket.emit('add peer', true, connectedSockets[i].id);
        }
    }

    //broadcast the signal to specific socket
    socket.on('peer call', function(data) {
        var d = JSON.parse(data);
        console.log(d.sendSignalTo);
        io.to(d.sendSignalTo).emit('peer response', data);
    });

    //send roles to clients
    socket.emit('update roles', roles);

    //send the message out
    socket.on('chat message', function(role, msg) {
        socket.broadcast.emit('chat message', role, msg);
    });

    //socket has joined channel, temporarily not used
    socket.on('join', function(role) {

    });

    //change current user role
    socket.on('role change', function(role) {

    });

    // // To listen for a client's disconnection from server and intimate other clients about the same
    socket.on('disconnect', function(data) {
        connectedSockets = socketRemove(connectedSockets, socket);
        console.log("Connected Sockets" + connectedSockets);
        //remove peer for this socket from every client
        //socket.broadcast.emit('remove peer', socket.id);
    });
});

function socketRemove(arr, value) {
    return arr.filter(function(ele) {
        return ele != value;
    });
}

http.listen(3000, function() {
    console.log('listening on *:3000');
});
