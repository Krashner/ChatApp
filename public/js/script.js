$(function() {
    var socket = io();
    var previousRole;
    var peers = [];
    var currentRole;
    
    $(".chat-target-btn").click(function() {
        $(".chat-target-btn").removeClass("active");
        $(this).addClass("active");
    });


    //create a new peer connection
    socket.on('add peer', function(isInitiator, targetSocketID) {
        console.log("create peer");
        //this method will not work when trying to connect to more than one at a time, needs a fix

        var p = new SimplePeer({
            initiator: isInitiator,
            trickle: false,
            //config: {"iceServers":[]}
        });

        p.sendSignalTo = targetSocketID;
        p.signalOriginator = socket.id;
        p.sendingPeerID = p._id;
        setPeerListeners(p);
        peers.push(p);
    });

    //remove closed peer connection
    function removePeer() {

    }

    function setPeerListeners(peer) {

        //send signal to reciever
        peer.on('signal', function(data) {
            data.sendSignalTo = peer.sendSignalTo;
            //~ signalOriginator = socket.id;
            data.signalOriginator = peer.signalOriginator;
            //~ sendingPeerID = p._id;
            data.sendingPeerID = peer.sendingPeerID;
            console.log('SIGNAL', JSON.stringify(data));
            socket.emit('peer call', JSON.stringify(data));
        });

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

        //error
        peer.on('error', function(err) {
            console.log('error', err)
        })

    }

    //peer response to signal
    socket.on('peer response', function(data) {
        var d = JSON.parse(data);
        console.log(d);
        console.log(peers);
        //if an offer is recieved, create a non-iniator peer and respond
        if (d.type === "offer") {
            console.log("create peer 2");
            //create a non-initiating peer
            var p = new SimplePeer({
                initiator: false,
                trickle: false,
                //config: {"iceServers":[]}
            });
            p.sendSignalTo = d.signalOriginator;
            p.signalOriginator = d.sendSignalTo;
            p.sendingPeerID = d.sendingPeerID;
            console.log("Offer Recieved:   Originator: " + p.signalOriginator + " Target " + p.sendSignalTo + " PeerID: " + d.sendingPeerID);
            setPeerListeners(p);
            p.signal(data);
            peers.push(p);
        } else {
            console.log("Answer Recieved:   Originator: " + d.signalOriginator + " Target " + d.sendSignalTo + " PeerID: " + d.sendingPeerID);
            //if an answer is recieved, give data to original peer
            console.log("got an answer");

            for (var i = 0; i < peers.length; i++) {
                if (peers[i]._id === d.sendingPeerID) {
                    console.log("connecting call");
                    peers[i].signal(data);
                }
            }
        }
    });


    $('form').submit(function(e) {
        e.preventDefault(); // prevents page reloading
        //don't allow blank messages
        var text = $('#chat-input').val();
	var role = currentRole;
        //send message, clear message box and add message to local chat
        if (text.replace(/\s+/g, '') !== '' && role !== undefined) {
            role += " " + timeNow();
            socket.emit('chat message', currentRole, text);
            //peer.send(text);
            $('#chat-input').val('');
            addMessageToLog(role, text);
        }
        $('#chat-input').focus();
        return false;
    });
    
    //get the selected role
    $('#roles-dropdown').on('click', '.dropdown-item', function(e){
	//enable the old button and a red light
	if(currentRole !== this.id){
	    $("#" + currentRole +"-Selector").removeClass("disabled-btn");
        $("#" + currentRole +"-Selector > .status-light" ).css('background-color','#dc3545');
	}
	currentRole = this.id;
	$("#roles-dropdown-button").text(currentRole);
	//disable the new button and turn the light green
	$("#" + currentRole +"-Selector").addClass("disabled-btn");
    console.log($("#" + currentRole +"-Selector > status-light" ));
    $("#" + currentRole +"-Selector > .status-light" ).css('background-color','#43b581');
    });
    
    //update chat log with recieved message
    socket.on('chat message', function(header, msg) {
        addMessageToLog(header, msg);
    });

    //get the user roles
    socket.on('update roles', function(roles) {
        $('#roles-dropdown').empty();
        roles.forEach(function(entry) {
	    $('#roles-dropdown').append($('<button id="' + entry + '"class="dropdown-item btn btn-outline-dark">').text(entry));
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
