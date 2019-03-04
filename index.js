var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var fs = require('fs');
var path = require('path');

var roles = [];
var onlineUsers = [];
var connectedSockets = [];


//server static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
//bootstrap css
app.use('/css', express.static(__dirname + '/node_modules/bootstrap/dist/css'));
//bootstrap js
app.use('/js', express.static(__dirname + '/node_modules/bootstrap/dist/js'));
//simple peer
app.use('/simple-peer', express.static(__dirname + '/node_modules/simple-peer'));

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

    //add peers
    for (var i = 0; i < connectedSockets.length; i++) {
        if (connectedSockets[i] != socket) {
            //give target a peer connection to me
            io.to(connectedSockets[i].id).emit('add peer', true);
            //give me a connection to target
            socket.emit('add peer', false);
        }
    }


    console.log("Connected Sockets:" + connectedSockets);
    //send roles to clients
    socket.emit('update roles', roles);

    //send the message out
    socket.on('chat message', function(role, msg) {
        socket.broadcast.emit('chat message', role, msg);
    });

    //socket has joined channel, temporarily not used
    socket.on('join', function(role) {
        onlineUsers.push({
            id: socket.id,
            username: role
        });
        console.log(onlineUsers);
        console.log("-----------------------------------------------------");
        io.emit('onlineUsers', onlineUsers, Object.keys(onlineUsers).length);
    });

    //change current user role
    socket.on('role change', function(role) {
        removeFromUsers(socket.id, role);
        //emit user list to all users
        io.emit('onlineUsers', onlineUsers, Object.keys(onlineUsers).length);
        console.log(onlineUsers.indexOf({
            id: socket.id,
            username: role
        }));
        findIndex(onlineUsers, socket.id, role);
    });

    //answer the offer
    socket.on('peer signal', function(sender, type, data) {
        socket.broadcast.emit('peer answer',sender, type, data);
    });

    // // To listen for a client's disconnection from server and intimate other clients about the same
    socket.on('disconnect', function(data) {
        removeFromUsers(socket.id, null);
        connectedSockets = socketRemove(connectedSockets, socket);
        console.log("Connected Sockets" + connectedSockets);
    });
});

function socketRemove(arr, value) {
    return arr.filter(function(ele) {
        return ele != value;
    });
}

function removeFromUsers(id, safeRole) {
    var result = onlineUsers.filter(obj => {
        return obj.id === id && safeRole !== obj.role
    })

    result.forEach(element => {
        var index = onlineUsers.indexOf(element);
        onlineUsers.splice(index, 1);
    });
}

function findIndex(array, id, role) {
    var result = array.filter(obj => {
        return obj.id === id && obj.role !== role
    })

    result.forEach(element => {
        var index = onlineUsers.indexOf(element);
        console.log(index);
    });
}

function findWithAttr(array, attr, value) {
    for (var i = 0; i < array.length; i += 1) {
        if (array[i][attr] === value) {
            return i;
        }
    }
    return -1;
}

http.listen(3000, function() {
    console.log('listening on *:3000');
});