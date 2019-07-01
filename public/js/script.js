$(function() {
    var socket = io();
    var previousRole;
    var peers = [];
    var currentRole;
    var selectedRole;
    var globalStream;


    
    //******************************************************************
    // stream functions
    //******************************************************************
    
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then(function(stream) {
         globalStream=stream;
         socket.emit('allow call');
         var video = document.querySelector('#localVideo');
         video.srcObject = stream;
    })
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
	socket.emit('allow call');
    });
    
    
    //******************************************************************
    // socket functions
    //******************************************************************
    
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
            if(peer.stream==null)
                peer.addStream(globalStream);
            //peer.addStream(globalStream);
            // navigator.mediaDevices.getUserMedia({
            //     audio: true,
            //     video: true
            // })
            // .then(function(stream) {
            //     peer.addStream(stream);
            // })
            // .catch(function(err) {
            //     console.log(err.name + ": " + err.message);
            // });
        });

        //data channel is being used
        peer.on('data', function(data) {
            console.log('data: ' + data);
        })

        //streaming
        peer.on('stream', function(stream) {
            console.log("STREAM");
            var video = document.querySelector('#remoteVideo');
            video.srcObject = stream;
            // //var audio = document.querySelector('#remote-audio');
            // //audio.srcObject = stream;
            // //console.log(audio.srcObject);
            // var video = document.querySelector('#remoteVideo');
            // //// Older browsers may not have srcObject
            // video.srcObject = stream;


            // navigator.mediaDevices.getUserMedia({
            //     audio: true,
            //     video: true
            // })
            // .then(function(stream) {
            //     var video = document.querySelector('#localVideo');
            //     // Older browsers may not have srcObject
            //     if ("srcObject" in video) {
            //         //video.srcObject = stream;
            //         p.addStream(stream);
            //         // video[0].load();
            //         // video[0].play();
            //     } else {
            //         // Avoid using this in new browsers, as it is going away.
            //         //video.src = window.URL.createObjectURL(stream);
            //     }
            // })
            // .catch(function(err) {
            //     console.log(err.name + ": " + err.message);
            // });

            //var video = document.createElement('video');
            //video.srcObject = stream;
            //document.body.appendChild(video);
            //video.play();
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
    
    //create a new peer connection
    socket.on('add peer', function(isInitiator, targetSocketID) {
        console.log("add peer " + socket.id);      
        var p = createPeer(isInitiator, socket.id, targetSocketID, null);
        console.log(p);       
        peers.push(p);
    });

    
    //remove peer closed peer connection
    socket.on('remove peer', function(peerID) {
	console.log("remove peer " + peerID);     
	tempPeers = [];
	for (var i = 0; i < peers.length; i++) {
	    if (peers[i]._id !== peerID) {
		//create new array without peer that's being removed
		tempPeers.push(peers[i]);
	    }
	}
	peers = tempPeers;
	console.log(peers);
    })

    //peer response to signal
    socket.on('peer response', function(data) {
        var d = JSON.parse(data);
        console.log(d);
        console.log(peers);
        //if an offer is recieved, create a non-iniator peer and respond
        if (d.type === "offer") {
            console.log("create peer 2");
            //create a non-initiating peer and return to sender
            var p = createPeer(false, d.sendSignalTo, d.signalOriginator, d.sendingPeerID);
            //~ p.signalOriginator = d.sendSignalTo;
            //~ p.sendSignalTo = d.signalOriginator;
            //~ p.sendingPeerID = d.sendingPeerID;
            console.log("Offer Recieved:   Originator: " + p.signalOriginator + " Target " + p.sendSignalTo + " PeerID: " + d.sendingPeerID);
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
    
    //update chat log with recieved message
    socket.on('chat message', function(header, msg) {
        addMessageToLog(header, msg);
    });

    //get the user roles
    socket.on('update roles', function(roles) {
        $('#modal-role-row').empty();
        roles.forEach(function(entry) {
	    $('#modal-role-row').append($('<button type="button" id="' + entry + '"class="role-select-item btn role-select-btn">').text(entry));
        });
    });
    
    //create a peer object and return it
    function createPeer(initiator, originatorID, sendToID, peerID){
        var p = new SimplePeer({
                initiator: initiator,
                trickle: false,
                //config: {"iceServers":[]}
                stream : globalStream
            });
	    console.log(globalStream);
            p.signalOriginator = originatorID;
            p.sendSignalTo = sendToID;
            p.sendingPeerID = peerID;
            
            if(p.sendingPeerID === null)
                p.sendingPeerID = p._id;
                
            setPeerListeners(p);
            return p;
    }
    
    
    //******************************************************************
    // chat functions
    //******************************************************************
    
    //send message, clear message box and add message to local chat
    $('form').submit(function(e) {
        e.preventDefault();
        var text = $('#chat-input').val();
        var role = currentRole;
        if (text.replace(/\s+/g, '') !== '' && role !== undefined && role !== "None") {
            role += " " + timeNow();
            socket.emit('chat message', currentRole, text);
            //peer.send(text);
            $('#chat-input').val('');
            addMessageToLog(role, text);
        }
        $('#chat-input').focus();
        return false;
    });
        
    //toggle chat target buttons on and off
    $(".chat-target-btn").click(function() {
        $(".chat-target-btn").removeClass("active-target");
        $(this).addClass("active-target");
    });
    
    //change the current role to selection and toggle the status lights
    $("#btn-select-role").click(function() {
        $("#" + currentRole +"-Selector").removeClass("disabled-btn");
	$("#" + currentRole +"-Selector > .status-light" ).css('background-color','#dc3545'); //red
	currentRole = selectedRole;
        $("#roles-button").text("Role: " + currentRole);
        $("#" + currentRole +"-Selector").addClass("disabled-btn");
	$("#" + currentRole +"-Selector").removeClass("active-target");
        $("#" + currentRole +"-Selector > .status-light" ).css('background-color','#43b581'); //green
    });
    
    //get the selected role
    $('#modal-role-row').on('click', '.role-select-btn', function(e){
        if(currentRole !== this.id){
	    $("#" + selectedRole).removeClass("active-target");
	    $("#" + selectedRole).removeClass("disabled-btn");
	    $(this).addClass("active-target");
	    $(this).addClass("disabled-btn");
	    selectedRole = this.id;
        }
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

//test function
function fillChat(){
    for(var i =0; i < 1000; i++)
	addMessageToLog("test", "testing: " + i);
}

//add messages to log
function addMessageToLog(header, msg) {
    $('#messages').append($('<li class="header">').text(header));
    $('#messages').append($('<li>').text(msg));
}
