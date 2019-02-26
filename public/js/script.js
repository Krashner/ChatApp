$(function () {
  var socket = io();
  console.log(socket);
  var previousRole;
  var peer = new SimplePeer({ initiator: location.hash === '#1', trickle: false });

  //join the room after a role is selected
  $("#roles").on('focus', function () {
    // Store the current value on focus and on change
    previousRole = this.value;
  }).change(function () {
    var role = this.value;
    if (this.value === 'None') {
      socket.emit('role change', null);
    } else {
      if (previousRole != role) {
        socket.emit('role change', role);
        if (role !== null) {
          socket.emit('join', role);
          console.log("joining");
          previous = this.value;
        }
      }
    }
  });


  peer.on('error', function (err) { console.log('error', err) })

  peer.on('connect', function () {
    console.log('CONNECT')
    peer.send('whatever' + Math.random())
  })

  peer.on('signal', function (data) {
    console.log('SIGNAL', JSON.stringify(data))
    socket.emit('peer signal', JSON.stringify(data));
  })

  peer.on('data', function (data) {
    console.log('data: ' + data)
  })

  peer.on('stream', function (stream) {
    console.log("STREAM");
  })

  socket.on('peer answer', function (data) {
    console.log("RECIEVED ", data);
    peer.signal(data);
  });

  $('form').submit(function (e) {
    e.preventDefault(); // prevents page reloading
    //don't allow blank messages
    var text = $('#m').val();
    var role = $('#roles').val();
    //send message, clear message box and add message to local chat
    if (text.replace(/\s+/g, '') !== '' && role !== '') {
      role += " " + timeNow();
      socket.emit('chat message', role, text);
      $('#m').val('');
      addMessageToLog(role, text);
    }
    return false;
  });

  //update chat log with recieved message
  socket.on('chat message', function (header, msg) {
    addMessageToLog(header, msg);
  });

  //get the user roles
  socket.on('update roles', function (roles) {
    $('#roles').text = "";
    roles.forEach(function (entry) {
      $('#roles').append($('<option>').val(entry).text(entry));
    });
  });

  //track users online
  socket.on('onlineUsers', function (onlineUsers, count) {
    // console.log(JSON.parse(onlineUsers));
    console.log(onlineUsers);
    $('#users').text(count);
  });

  //add messages to log
  function addMessageToLog(header, msg) {
    $('#messages').append($('<li class="header">').text(header));
    $('#messages').append($('<li>').text(msg));
  }
  //get a timestamp
  function timeNow() {
    var d = new Date(),
      h = (d.getHours() < 10 ? '0' : '') + d.getHours(),
      m = (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    return h + ':' + m + ': ';
  }

});
