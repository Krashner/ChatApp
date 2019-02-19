$(function () {
  var socket = io();
  var date = new Date();
  $('form').submit(function (e) {
    e.preventDefault(); // prevents page reloading
    //don't allow blank messages
    var text = $('#m').val();
    var role = $('#role').val();
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
  //get roles
  socket.on('update role', function (role) {
    $('#role').append($('<option>').val(role).text(role));
  });

  socket.on('onlineUsers', function (onlineCount) {
    $('#users').val(onlineCount);
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