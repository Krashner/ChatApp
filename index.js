const express = require('express');             //used for serving content to user
const app = express();                          //used for routing
const http = require('http');                   //for creating ssl connection
const https = require('https');                   //for creating ssl connection
const fs = require('fs');                       //for reading and writing files
const path = require('path');                   //used for serving public folder to users
//const sqlite3 = require('sqlite3').verbose();   //for using the database
var chatLogDB;                                  //chat log database
var roles = [];                                 //array of roles to give the users
var connectedSockets = {};                      //object containing sockets connected to server
var currentLogFile;                             //log file to write to & read from
const PORT = process.env.PORT || 3000;		    //added for web server deployment
const hostname = 'localhost';			        //for reverse proxy
var server;					                    //the server
var io;						                    //socket io

var pgtools = require("pgtools");
const config = {
    user: "postgres",
    host: "localhost",
    password: "emaint",
    port: 5432
};

const { Pool, Client } = require("pg");

const pool = new Pool({
    user: "postgres",
    host: "localhost",
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
//database
app.use('/database', express.static('/database'));

//temp
//startNginx();
startHTTPS();

//start a https serversome_db
function startHTTPS() {
    //create the https server
    server = https.createServer({
        key: fs.readFileSync('certificates/chatappLocalhost.pvk'),
        cert: fs.readFileSync('certificates/chatappLocalhost.cer')
    }, app).listen(PORT, () => {
        console.log(`> listening on *:${PORT}`);
        createDB();
        //chatLogDB  = new sqlite3.Database(__dirname + "/database/chatlog.db");  
        // chatLogDB.get("SELECT name From sqlite_master WHERE type ='table' AND name='messages'",function(err, table){
        //     if(table === undefined)
        //     {
        //         console.log('> Creating Database Table');
        //         chatLogDB.run('CREATE TABLE messages(id INTEGER primary key, author TEXT, time TEXT, message TEXT)');     
        //     }
        // });
    });
    //require socketi.io to talk to websockets
    io = require('socket.io').listen(server);
}

//start a http server that using nginx as a reverse proxy
function startNginx() {
    server = app.listen(PORT, hostname, () => {
        console.log(`Server running at http://${hostname}:${PORT}/`);
        console.log(`> listening on *:${PORT}`);
        createDB();
        //chatLogDB  = new sqlite3.Database("./database/chatlog.db");  
        //chatLogDB.get("SELECT name From sqlite_master WHERE type ='table' AND name='messages'",function(err, table){
        //     if(table === undefined)
        //     {
        //         console.log('> Creating Database Table');
        //         chatLogDB.run('CREATE TABLE messages(id INTEGER primary key, author TEXT, time TEXT, message TEXT)');     
        //     }
        // });

    });
    //require socketi.io to talk to websockets
    io = require('socket.io').listen(server);
}

function createDB() {
    //pgtools.dropdb(config, "ChatAppDB", function (err, res) {});

    pgtools.createdb(config, "ChatAppDB", function (err, res) {
        if (err) {
            // pool.query("INSERT INTO messages(username, date, message)VALUES('Krashner', '3-5-20 10:00', 'Hey, man!');", (err, res) => {
            //     console.error(err, res);
            //     pool.end();
            // });
        } else {
            console.log('> Creating Database');
            query("CREATE TABLE messages(id SERIAL PRIMARY KEY, username TEXT, date TEXT, message TEXT);", (res) => { });
            // pool.query("CREATE TABLE messages(id SERIAL PRIMARY KEY, username TEXT, date TEXT, message TEXT);", (err, res) => {
            //     //console.error(err, res);
            //     //pool.end();
            // });
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
    //fs.appendFile(currentLogFile, ">" + d.header + "\n" + "-" + d.message + "\n", function(err){if(err)throw err;});
    //chatLogDB.run("INSERT INTO messages(author, time, message) values(?,?,?)", d.sender, d.timeStamp, d.message, function(err){if(err)throw err;});
    //"INSERT INTO messages(author, time, message)VALUES("+d.sender+","+ d.timeStamp+","+ d.message+ ");"
    pool.query("INSERT INTO messages(username, date, message)VALUES('" + d.sender + "','" + d.timeStamp + "','" + d.message + "');", (err, res) => {
        if (err)
            console.error(err, res);
    });
}


//gets the most recent 25 messages from the db
function GetCurrentLog(socket) {
    socket.emit('clear messages');
    var dataArr = [];
    //var sql = `SELECT * FROM messages LIMIT 25 OFFSET (SELECT COUNT(*) FROM messages)-25`;
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

    // pool.query(sql, (err, res) => {
    //     if (err) {
    //         console.error(err, res);
    //     } else {
    //         res.rows.forEach((row) => {
    //             var data = {
    //                 id: row.id,
    //                 sender: row.username,
    //                 timeStamp: row.date,
    //                 message: row.message
    //             };
    //             dataArr.unshift(data);
    //         });
    //         socket.emit('retrieve log append', JSON.stringify(dataArr));
    //     }
    // });
}

function query(sql, callback) {
    pool.query(sql, (err, res) => {
        if (!err)
            callback(res);
    });
}

//gets id, then gets the specified range from database
function getIDAndMessages(socket, data) {
    var dataArr = [];
    var d = JSON.parse(data)
    console.log(d);
    var sql = `SELECT * 
                FROM messages
                WHERE username = '`+ d.sender + `' AND date = '` + d.timeStamp + `' AND message = '` + d.message + `';`;



    query(sql, (res) => {
        var id = res.rows[0].id;
        if (id === 0)
            return;
        var sql = `SELECT * 
                    FROM (SELECT * FROM messages ORDER BY id DESC) T
                    WHERE id < ` + id + ` LIMIT 5;`;
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

/* 
    //get id, then get range of messages
    pool.query(sql, (err, res) => {
        if (!err) {
            var id = res.rows[0].id;
            if (id === 0)
                return;
            var sql = `SELECT * 
                        FROM (SELECT * FROM messages ORDER BY id DESC) T
                        WHERE id < ` + id + ` LIMIT 5;`;
            pool.query(sql, (err, res) => {
                if (!err) {
                    var dataArr = [];
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
                }
            });
        }
    }); */



    // pool.query(sql, (err, res) => {
    //     if (err) {
    //         console.error(err, res);
    //     } else {
    //         res.rows.forEach((row) => {
    //             var data = {
    //                 id: row.id,
    //                 sender: row.username,
    //                 timeStamp: row.date,
    //                 message: row.message
    //             };
    //             dataArr.push(data);
    //         });
    //         socket.emit('retrieve log prepend', JSON.stringify(dataArr));
    //     }
    // });

    // chatLogDB.each(sql, [d.sender, d.timeStamp, d.message], (err, row) =>
    // {
    //     if(err){
    //         throw err;
    //     }else if(row!== undefined){

    //         var data = {
    //             sender: row.author,
    //             timeStamp: row.time,
    //             message: row.message,
    //             id: row.id
    //         };
    //         dataArr.push(data);
    //     }
    // }, (err, count) =>
    // {   
    //     if(err)
    //         throw err;
    //     else
    //         socket.emit('retrieve log prepend', JSON.stringify(dataArr));
    // });
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
