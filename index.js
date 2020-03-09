const express = require('express');             //used for serving content to user
const app = express();                          //used for routing
const http = require('http');                   //for creating ssl connection
const https = require('https');                 //for creating ssl connection
const fs = require('fs');                       //for reading and writing files
const path = require('path');                   //used for serving public folder to users
var roles = [];                                 //array of roles to give the users
var connectedSockets = {};                      //object containing sockets connected to server
const PORT = process.env.PORT || 3000;		    //added for web server deployment
const hostname = 'localhost';			        //for reverse proxy
var server;					                    //this server
var io;						                    //socket io
var pgtools = require("pgtools");               //for creating a database if none exists
const config = {                                //config for the database
    user: "postgres",
    host: "142.93.62.143",//localhost
    database: "ChatAppDB",
    password: "emaint",
    port: 5432
};
const { Pool, Client } = require("pg");         //for postgres database
const pool = new Pool({                         //for accessing the database
    user: "postgres",
    host: "142.93.62.143",//localhost
    database: "ChatAppDB",
    password: "emaint",
    port: "5432"
});

//server static files from "public" folder
app.use(express.static('public'));
//socket.io js
app.use('/socket.io', express.static('node_modules/socket.io-client/dist'));
//bootstrap js
app.use('/bootstrap', express.static('node_modules/bootstrap'));
//jquery
app.use('/jquery', express.static('node_modules/jquery/dist'));
//simple peer
app.use('/simple-peer', express.static('node_modules/simple-peer'));
//font awesome
app.use('/font-awesome', express.static('node_modules/@fortawesome/fontawesome-free'));
//js-cookie
app.use('/js-cookie', express.static('node_modules/js-cookie'));

//start the app
main()

//read the command line args to determine what type of server to run
function main() {
    var myArgs = process.argv.slice(2);
    if (myArgs !== undefined && myArgs.length > 0) {
        switch (myArgs[0].toLowerCase()) {
            case 'http':
                startServer("http");
                break;
            case 'https':
                startServer("https");
                break;
            case 'https-ss':
                startServer("https-ss");
                break;
            default:
                startServer("https");
        }
    } else {
        startServer("http");
    }
}

//start either an http or https server
//http: use with a reverse proxy server
//https: use without a reverse proxy server
//https-ss: same as https, but using a self-signed certificate
//SSL keys must be acquired from a trusted CA or generated and self-signed
function startServer(type) {
    if (type === "https") {
        //create a https server using a trusted certificate authority
        server = https.createServer({
            cert: fs.readFileSync('certificates/cert.crt'),
            ca: fs.readFileSync('certificates/ca.crt'),
            key: fs.readFileSync('certificates/private.key')
        }, app).listen(PORT, () => {
            console.log(`> HTTPS server listening on *:${PORT}`);
            createDB();
        });
    } else if (type === "https-ss") {
        //create a https server with a self-signed certificate
        server = https.createServer({
            cert: fs.readFileSync('certificates/exampleCert.crt'),
            key: fs.readFileSync('certificates/exampleKey.key')
        }, app).listen(PORT, () => {
            console.log(`> HTTPS server listening on *:${PORT}`);
            createDB();
        });
    } else {
        server = app.listen(PORT, hostname, () => {
            console.log(`> HTTP server listening on *:${PORT}`);
            createDB();
        });
    }
    //require socket.io to communicate with websockets
    io = require('socket.io').listen(server);
}

//attempt to create a database, if it doesn't exist then also create the messages table
function createDB() {
    pgtools.createdb(config, "ChatAppDB", function (err, res) {
        console.log(err, res);
        if (err) {
            console.log('> Database Found');
        } else {
            console.log('> Creating Database');
            console.log('> Creating Table');
            query("CREATE TABLE messages(id SERIAL PRIMARY KEY, username TEXT, date TEXT, message TEXT);", (res) => { });
        }
    });
}

//get the roles from admin file
fs.readFile('admin.json', 'utf8', function (err, contents) {
    roles = JSON.parse(contents).roles;
});

//on socket connection, set listeners
io.on('connection', function (socket) {

    //record client connecting
    console.log(getTimestamp(), "client connected || id:", socket.id);

    //send roles to clients
    socket.emit('update roles', roles);

    GetCurrentLog(socket);

    //sends message to all sockets to create a new peer
    socket.on('find peers', function (data) {
        //give this socket a initiator peer for every connected socket except one with their ID
        for (var userID in connectedSockets) {
            if (userID != socket.id) {
                console.log(getTimestamp(), "initiating peer connection || sender:", socket.id, "reciever:", connectedSockets[userID].id);
                socket.emit('create peer', true, connectedSockets[userID].id);
            }
        }
        //add this socket to the array
        if (connectedSockets[socket.id] == null)
            connectedSockets[socket.id] = socket;
        //set role to default if null
        if (connectedSockets[socket.id].role == null)
            connectedSockets[socket.id].role = roles[0];
    });

    //send socket a peer offer
    socket.on('peer offer', function (data) {
        var d = JSON.parse(data);
        console.log(getTimestamp(), "offering peer request || sender:", socket.id, "reciever:", d.sendSignalTo);
        io.to(d.sendSignalTo).emit('peer offer', data);
    });

    //send socket a peer answer
    socket.on('peer answer', function (data) {
        var d = JSON.parse(data);
        console.log(getTimestamp(), "answering peer request || sender:", socket.id, "reciever:", d.sendSignalTo);
        io.to(d.sendSignalTo).emit('peer answer', data);
    });

    //send the message out
    socket.on('chat message', function (data) {
        socket.broadcast.emit('chat message', data);
        writeToDB(data);
    });

    //socket has joined channel, temporarily not used
    socket.on('join', function (role) {

    });

    //socket has joined channel, temporarily not used
    socket.on('retrieve messages', function (data, amount) {
        //getPreviousMessages(socket, data, amount)
        getIDAndMessages(socket, data);
    });

    //confirm the peer connection
    socket.on('peers connected', function (initiator, reciever) {
        console.log(getTimestamp(), "peers connected || initiator:", initiator, "reciever:", reciever);
    });

    //change current user role
    socket.on('role change', function (socketID, role) {
        if (connectedSockets[socketID] == null)
            connectedSockets[socketID] = socket;
        connectedSockets[socketID].role = role;
        socket.broadcast.emit('role change', socketID, role);
    });

    //gets the roles for the users connected to this socket
    socket.on('get role', function (socketID) {
        var role = connectedSockets[socketID].role;
        if (roles.includes(role)) {
            socket.emit('role change', socketID, role);
        }
    });

    //toggle transmit light
    socket.on('transmit light', function (fromSocketID, toSocketID, isOn) {
        io.to(toSocketID).emit('change light', fromSocketID, isOn);
    });

    //To listen for a client's disconnection from server and inform other clients
    socket.on('disconnect', function (data) {
        delete connectedSockets[socket.id];
        console.log(getTimestamp(), "client disconnected || id:", socket.id);
        //remove peer for this socket from every client
        socket.broadcast.emit('remove peer', socket.id);
    });
});

//prints a list of connected clients
function printCurrentClients() {
    console.log(getTimestamp(), "Currently Connected Clients");
    for (var client in connectedSockets) {
        console.log("       id:", client);
    }

}

//write message to database
function writeToDB(data) {
    var d = JSON.parse(data)
    var sql = "INSERT INTO messages(username, date, message)VALUES('" + d.sender + "','" + d.timeStamp + "','" + d.message + "');"
    query(sql, (res) => { });
}


//gets the most recent 25 messages from the db
function GetCurrentLog(socket) {
    socket.emit('clear messages');
    var dataArr = [];
    var sql = `SELECT * FROM messages ORDER BY id DESC LIMIT 25`;

    query(sql, (res) => {
        res.rows.forEach((row) => {
            var data = {
                id: row.id,
                sender: row.username,
                timeStamp: row.date,
                message: row.message
            };
            dataArr.unshift(data);
        });
        socket.emit('retrieve log append', JSON.stringify(dataArr));
    });
}

//do sql query and then call the callback
function query(sql, callback) {
    pool.query(sql, (err, res) => {
        if (!err && callback)
            callback(res);
        else
            console.error(err, res);
    });
}

//gets id, then gets the specified range from database
//maybe I can set a variable for id in the query, and then use a subquery to reduce to a single call?
function getIDAndMessages(socket, data) {
    var dataArr = [];
    var d = JSON.parse(data)
    var sql = `SELECT * 
                FROM messages
                WHERE username = '`+ d.sender + `' AND date = '` + d.timeStamp + `' AND message = '` + d.message + `';`;
    //get the id
    query(sql, (res) => {
        var id = res.rows[0].id;
        if (id === 0)
            return;
        var sql = `SELECT * 
                    FROM (SELECT * FROM messages ORDER BY id DESC) T
                    WHERE id < ` + id + ` LIMIT 25;`;
        //get the previous 25 messages
        query(sql, (res) => {
            res.rows.forEach((row) => {
                var data = {
                    id: row.id,
                    sender: row.username,
                    timeStamp: row.date,
                    message: row.message
                };
                dataArr.unshift(data);
            });
            socket.emit('retrieve log prepend', JSON.stringify(dataArr));
        });
    });
}

//return a formatted timestamp for the console
function getTimestamp() {
    return "> " + timeNow();
}

//get a timestamp
function dateNow() {
    var d = new Date();
    return d.getDate() + "-" + d.getMonth() + "-" + d.getFullYear();
}

//get a timestamp
function timeNow() {
    var d = new Date(),
        h = (d.getHours() < 10 ? '0' : '') + d.getHours(),
        m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    return h + ':' + m;
}
