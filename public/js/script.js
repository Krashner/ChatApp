$(function() {
    var socket = io();
    var previousRole;
    var peers = [];

    //join the room after a role is selected
    $("#roles").on('focus', function() {
        // Store the current value on focus and on change
        previousRole = this.value;
    }).change(function() {
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

    socket.on('add peer', function(isInitiator) {
	var peer = createPeer(isInitiator);
        peers.push(peer);
        console.log(peers);
    });

    function removePeer() {

    }

    function setPeerListeners(peer) {
        //error
        peer.on('error', function(err) {
            console.log('error', err)
        })

        //peer connected
        peer.on('connect', function() {
            console.log('CONNECT')
            navigator.mediaDevices.getUserMedia({
                    audio: true,
                    video: true
                })
                .then(function(stream) {
                    var video = document.querySelector('#localVideo');
                    // Older browsers may not have srcObject
                    if ("srcObject" in video) {
                        video.srcObject = stream;
                        peer.addStream(stream);
                        // video[0].load();
                        // video[0].play();
                    } else {
                        // Avoid using this in new browsers, as it is going away.
                        //video.src = window.URL.createObjectURL(stream);
                    }
                })
                .catch(function(err) {
                    console.log(err.name + ": " + err.message);
                });
        });

        //send signal to reciever
        peer.on('signal', function(data) {
            console.log('SIGNAL', JSON.stringify(data));
            socket.emit('peer signal', JSON.stringify(peer), data.type, JSON.stringify(data));
        });

        //data channel is being used
        peer.on('data', function(data) {
            console.log('data: ' + data);
        })

        //streaming
        peer.on('stream', function(stream) {
            console.log("STREAM");
            var video = document.querySelector('#remoteVideo');
            // Older browsers may not have srcObject
            video.srcObject = stream;
        })

        //close connection
        peer.on('close', function() {
            console.log("CLOSE");
        })

    }


    //peer answered call
    socket.on('peer answer', function(peer, type, data) {
        console.log("RECIEVED ", data);

	if(type==="offer"){
            console.log("offer");
	    var peer = createPeer(false);
	    peer.signal(data);
            peers.push(peer);
	}else if(type==="answer"){
	    var originalPeer = JSON.parse(peer);
	    console.log(originalPeer._id);
	    peers.forEach(element => {
		if(element._id === originalPeer._id){
		    element.signal(data);
		    return;
		}
            });
        }

    });

    function createPeer(isInitiator){
        var p = new SimplePeer({
            initiator: isInitiator,
            trickle: false
        });
        setPeerListeners(p);
	return p;
    }

    $('form').submit(function(e) {
        e.preventDefault(); // prevents page reloading
        //don't allow blank messages
        var text = $('#m').val();
        var role = $('#roles').val();
        //send message, clear message box and add message to local chat
        if (text.replace(/\s+/g, '') !== '' && role !== '') {
            role += " " + timeNow();
            socket.emit('chat message', role, text);
            //peer.send(text);
            $('#m').val('');
            addMessageToLog(role, text);
        }
        return false;
    });


    //update chat log with recieved message
    socket.on('chat message', function(header, msg) {
        addMessageToLog(header, msg);
    });

    //get the user roles
    socket.on('update roles', function(roles) {
        $('#roles').empty();
        $('#roles').append($('<option>').val("None").text("None"));
        roles.forEach(function(entry) {
            $('#roles').append($('<option>').val(entry).text(entry));
        });
    });

    //track users online
    socket.on('onlineUsers', function(onlineUsers, count) {
        console.log(onlineUsers);
        $('#clients').empty();
        $('#clients').append($('<option>').val("None").text("None"));
        onlineUsers.forEach(function(entry) {
            if (entry.id !== socket.id && entry.username !== "")
                $('#clients').append($('<option>').val(entry).text(entry.username + " : " + entry.id));
        });
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