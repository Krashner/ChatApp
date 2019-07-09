var express = require('express');
var app = express();
var https = require('https');
var fs = require('fs');
var path = require('path');

var roles = [];
var connectedSockets = [];
var currentLogFile;
  
//server static files from "public" folder
app.use(express.static(path.join(__dirname, 'public')));
//socket.io js
app.use('/socket.io', express.static(__dirname + '/node_modules/socket.io-client/dist'));
//bootstrap js
app.use('/bootstrap', express.static(__dirname + '/node_modules/bootstrap'));
//jquery
app.use('/jquery', express.static(__dirname + '/node_modules/jquery/dist'));
//simple peer
app.use('/simple-peer', express.static(__dirname + '/node_modules/simple-peer'));
//font awesome
app.use('/font-awesome', express.static(__dirname + '/node_modules/@fortawesome/fontawesome-free'));
//get html
app.get('/', function(req, res) {res.sendFile(__dirname + '/index.html');});

var server = https.createServer({
    key: fs.readFileSync('certificates/server.key'),
    cert: fs.readFileSync('certificates/server.cert')
  }, app).listen(3000, () => {
    console.log('> listening on *:3000');
    currentLogFile = __dirname + '/logs/' + dateNow() + '.txt'; 
    if(fs.existsSync(__dirname + '/logs/') === false)
        fs.mkdir(__dirname + '/logs/', {recursive:true}, function(err){if(err)throw err;})
  })
  var io = require('socket.io').listen(server);

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function(err, contents) {
    roles = JSON.parse(contents).roles;
});

//on socket connection
io.on('connection', function(socket) {
    console.log(getTimestamp() + "client connected || id: " + socket.id);
    
    //starts creating calls to all sockets, except self
    socket.on('allow call', function(data) {
        //add socket to array
        connectedSockets.push(socket);
        //give this socket a initiator peer for every connected socket except one with their ID
        for (var i = 0; i < connectedSockets.length; i++) {
            if (socket.id !== connectedSockets[i].id) {
                console.log(getTimestamp()+ "sending request || sender: " + socket.id + " reciever: " + connectedSockets[i].id);
                socket.emit('add peer', true, connectedSockets[i].id);
            }
        }
    });

    //broadcast the response to specific socket
    socket.on('peer call', function(data) {
        var d = JSON.parse(data);
        console.log(getTimestamp()+ "creating peer connection || sender: " + socket.id + " reciever: " + d.sendSignalTo);
        io.to(d.sendSignalTo).emit('peer response', data);
    });

    //send roles to clients
    socket.emit('update roles', roles);

    //send the message out
    socket.on('chat message', function(data) { 
        socket.broadcast.emit('chat message', data);
        writeToDB(data);
    });

    //socket has joined channel, temporarily not used
    socket.on('join', function(role) {

    });

    //change current user role
    socket.on('role change', function(socketID, role) {
        socket.broadcast.emit('role change', socketID, role);
    });

    //To listen for a client's disconnection from server and intimate other clients about the same
    socket.on('disconnect', function(data) {
        connectedSockets = socketRemove(connectedSockets, socket);
        console.log(getTimestamp()+ "client disconnected || id: " + socket.id);
        //remove peer for this socket from every client
        socket.broadcast.emit('remove peer', socket.id);
    });
});

//remove socket from list of connected clients
function socketRemove(arr, value) {
    return arr.filter(function(ele) {
        return ele != value;
    });
}

//write message to database
function writeToDB(data){
    var d = JSON.parse(data)
    fs.appendFile(currentLogFile, d.header + "\n" + d.message + "\n", function(err){if(err)throw err;});
}

//retrieve message from database
function readFromDB(){

}


//return a formatted timestamp for the console
function getTimestamp(){
    return "> " + timeNow() + " ";
}

//get a timestamp
function dateNow() {
    var d = new Date();
    return d.getDate() + "-" + d.getMonth() + "-" +d.getFullYear();
}

//get a timestamp
function timeNow() {
    var d = new Date(),
        h = (d.getHours() < 10 ? '0' : '') + d.getHours(),
        m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    return h + ':' + m + ':';
}

