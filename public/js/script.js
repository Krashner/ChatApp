$(function () {
  var socket = io();
  console.log(socket);
  var previousRole;



  //join the room after a role is selected
  $("#roles").on('focus', function () {
    // Store the current value on focus and on change
    previousRole = this.value;
  }).change(function () {
    var role = this.value;
    if (this.value === 'None') {
      socket.emit('roll change', null);
    } else {
      if (previousRole != role) {
        socket.emit('roll change', role);
        if (role !== null) {
          socket.emit('join', role);
          console.log("joining");
          previous = this.value;
        }
      }
    }
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
    $('#roles').text="";
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