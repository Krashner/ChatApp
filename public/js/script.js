$(function() {
    var socket = io();
    var peers = [];
    var currentRole;
    var selectedRole;
    var localStream;
    var ingoreScroll = false;

    //******************************************************************
    // stream functions
    //******************************************************************

    //attempt to get the audio device
    getAudio();
	
    //manually retry on button press
    $("#reconnect-button").click(function(e) {
        if($("#connection-icon").hasClass("fas fa-phone-slash")){
            console.log("Attempting to get audio device.");
            getAudio();
        }
    });

    //toggle the connection icon on button
    function togglePhoneIcon(connected) {
        if (connected) $("#connection-icon").attr("class", "fas fa-phone");
        else $("#connection-icon").attr("class", "fas fa-phone-slash");
    }

    //get the audio and connect to peers
    function getAudio() {
        navigator.mediaDevices
            .getUserMedia({
                audio: true,
                video: false
            })
            .then(function(stream) {
                localStream = stream;
		console.log("START", socket.id);
                socket.emit("allow call");
                togglePhoneIcon(true);
            })
            .catch(function(err) {
                console.log(err.name + ": " + err.message);
                togglePhoneIcon(false);
		
		//enable this for debugging
		console.log("START", socket.id);
                socket.emit("allow call");
            });
    }

    //******************************************************************
    // peer listener functions
    //******************************************************************

    function setPeerListeners(peer) {
        //send signal to reciever
        peer.on("signal", function(data) {
	    console.log(data);
	    console.log("SIGNAL", peer.targetSocketID);
            data.sendSignalTo = peer.targetSocketID;
            data.signalOriginator = peer.localSocketID;
            data.sendingPeerID = peer.sendingPeerID;
            //socket.emit("peer call", JSON.stringify(data));
	    if (data.type === "offer") {
		socket.emit('peer offer', JSON.stringify(data));
	    }else{
		socket.emit('peer answer', JSON.stringify(data));
	    }
        });

        //peer connected
        peer.on("connect", function() {
            console.log("CONNECT", peer.targetSocketID);
            addUser(peer.targetSocketID, "None");
	    if(peer.initiator == true)
		socket.emit("peers connected", peer.localSocketID, peer.targetSocketID);
            //addAudioElement(peer.targetSocketID);
            //if (audio != null) audio.srcObject = stream;
        });

        //data channel is being used
        peer.on("data", function(data) {
            console.log("DATA", peer.targetSocketID);
        });

        //streaming
        peer.on("stream", function(stream) {
            console.log("STREAM", peer.targetSocketID);

            var audio = addAudioElement(peer.targetSocketID);
            if (audio != null) audio.srcObject = stream;
            //togglePeerTrack(peer, false);
        });

        //close connection
        peer.on("close", function() {
            console.log("CLOSE", peer.targetSocketID);
            removeUser(peer.targetSocketID);
        });

        //error
        peer.on("error", function(err) {
            console.log("ERROR", err);
        });
    }

    //******************************************************************
    // socket functions
    //******************************************************************

    //create a new peer connection
    socket.on("add peer", function(isInitiator, targetSocketID) {
        console.log("ADD PEER", targetSocketID);
        var p = createPeer(isInitiator, socket.id, targetSocketID, null);
        peers.push(p);
    });

    //remove peer closed peer connection
    socket.on("remove peer", function(socketID) {
        tempPeers = [];
        for (var i = 0; i < peers.length; i++) {
            if (peers[i].targetSocketID !== socketID) {
                //create new array without specific peer
                tempPeers.push(peers[i]);
            } else {
                console.log("REMOVE PEER", socketID);
                peers[i].destroy();
            }
        }
        //remove audio element
        removeAudioElement(socketID);
    });

    /*
    //peer response to signal
    socket.on("peer call", function(data) {
        var d = JSON.parse(data);
        //if an offer is recieved, create a non-iniator peer and respond
        if (d.type === "offer") {
            //create a non-initiating peer and return to sender
            var p = createPeer(false, d.sendSignalTo, d.signalOriginator, d.sendingPeerID);
	    console.log("OFFER",  p.localSocketID);
            p.signal(data);
            peers.push(p);
        } else {
	    console.log("ANSWER",  d.signalOriginator);
            //if an answer is recieved, give data to original peer
            for (var i = 0; i < peers.length; i++) {
                if (peers[i]._id === d.sendingPeerID) {
                    peers[i].signal(data);
                }
            }
        }
    });*/
    
    //socket recieved a peer offer
    socket.on("peer offer", function(data) {
	//create a non-initiating peer and send an answer to the sender
	var d = JSON.parse(data);
	var p = createPeer(false, d.sendSignalTo, d.signalOriginator, d.sendingPeerID);
	console.log("OFFER",  p.localSocketID);
	p.signal(data);
	peers.push(p);
    });
    
    //socket recieved a peer answer
    socket.on("peer answer", function(data) {
	var d = JSON.parse(data);
	console.log("ANSWER",  d.signalOriginator);
	//give the answer to the peer object that sent the offer
	for (var i = 0; i < peers.length; i++) {
	    if (peers[i]._id === d.sendingPeerID) {
		peers[i].signal(data);
	    }
	}
    });
    
    
    //update chat log with recieved message
    socket.on("chat message", function(data) {
        addMessageToLog(data);
    });

    //signal that audio is being transmitted
    $("#chat-transmit-btn").mousedown(function() {
        socket.emit("transmit light", socket.id, getTransmitTarget(), true);
        //transmitAudio(true);
    });

    //signal that audio is not being transmitted
    $("#chat-transmit-btn").mouseup(function() {
        socket.emit("transmit light", socket.id, getTransmitTarget(), false);
        //transmitAudio(false);
    });

    //get the target to send audio to
    function getTransmitTarget() {
        var targetID = $(".active-target");
        if(targetID.length == 0)
            return;
        return targetID.attr("id").slice(9);;
    }

    //gets the target socket to find the peer and toggles their stream track
    function transmitAudio(transmit){
        var socket = getTransmitTarget();
        var peer =findPeerBySocketID(socket);
        if(peer != null){
            togglePeerTrack(peer, transmit);
        }
    }

    //toggles the stream track on and off
    function togglePeerTrack(peer, status){
        peer.streams.forEach(function(stream) {
            stream.getTracks().forEach(function(track) {
                track.enabled = status;
            });
        });
    }

    //find the peer from the array based on the socket id
    function findPeerBySocketID(socketID){
        for (var i = 0; i < peers.length; i++) {
            if (peers[i].targetSocketID == socketID) {
                return peers[i];
            } 
        }
    }

    //toggle to status light green/red for users transmitting
    socket.on("change light", function(socketID, isOn) {
        if (isOn == true) {
            $("#selector-" + socketID)
                .find(".status-light")
                .css("background-color", "#43b581"); //green
        } else {
            $("#selector-" + socketID)
                .find(".status-light")
                .css("background-color", "#dc3545"); //red
        }
    });

    //update user role when server says they change it
    socket.on("role change", function(socketID, role) {
        $("#selector-" + socketID)
            .find(".chat-target-text")
            .text(role);
    });

    //get the user roles
    socket.on("update roles", function(roles) {
        $("#modal-role-row").empty();
        roles.forEach(function(entry) {
            $("#modal-role-row").append(
                $(
                    '<button type="button" id="' +
                        entry +
                        '"class="role-select-item btn role-select-btn">'
                ).text(entry)
            );
        });
    });

    //check for a audio element for socket, create one if it doesn't exist
    function addAudioElement(socketID) {
        var audio = document.getElementById("audio-" + socketID);
        if (audio == null) {
            audio = document.createElement("audio");
            audio.id = "audio-" + socketID;
            audio.className += " peer-audio";
            audio.autoplay = true;
            document.getElementById("audio-container").appendChild(audio);
        }
        return audio;
    }

    //******************************************************************
    // audio functions
    //******************************************************************

    //remove audio element
    function removeAudioElement(socketID) {
        var audio = document.getElementById("audio-" + socketID);
        if (audio !== null) audio.parentElement.removeChild(audio);
    }

    //create a peer object and return it
    function createPeer(isInitiator, originatorID, sendToID, peerID) {
	var cloneStream;
	if(localStream!=null)
	    cloneStream = localStream.clone();
        var peer = new SimplePeer({
            initiator: isInitiator,
            trickle: false,
            //config: {"iceServers":[]}
            stream: cloneStream
        });
        peer.localSocketID = originatorID;
        peer.targetSocketID = sendToID;
        peer.sendingPeerID = peerID;

        if (peer.sendingPeerID === null) 
	    peer.sendingPeerID = peer._id;

        setPeerListeners(peer);
        return peer;
    }

    //******************************************************************
    // chat functions
    //******************************************************************

    //adds the roles from the admin.json role list to the target container
    function addTargets(roles) {
        var container = $("#chat-target-container");
        var template = $("#target-template");
        for (var i = 0; i < roles.length; i++) {
            if (roles[i] == "None") continue;
            var newTarget = template.clone();
            newTarget
                .attr("id", roles[i] + "-Selector")
                .find(".chat-target-text")
                .html(roles[i]);
            newTarget.find(".status-light").attr("id", roles[i] + "-status");
            newTarget.find(".mute-container").attr("id", roles[i] + "-mute");
            newTarget.appendTo(container).show();
        }

        //create a button for all call, remove status light and mute
        var newTarget = template.clone();
        newTarget
            .attr("id", "AllCall-Selector")
            .find(".chat-target-text")
            .html("All Call");
        newTarget.find(".status-container").empty();
        var mute = newTarget.find(".mute-container");
        mute.empty();
        mute.removeClass("mute-container");
        newTarget.appendTo(container).show();
    }

    function addUser(socketID, role) {
        var container = $("#chat-target-container");
        var template = $("#target-template");
        var newTarget = template.clone();
        newTarget
            .attr("id", "selector-" + socketID)
            .find(".chat-target-text")
            .html(role);
        newTarget.find(".status-light").attr("id", "status-" + socketID);
        newTarget.find(".mute-container").attr("id", "mute-" + socketID);
        newTarget.appendTo(container).show();
    }

    function removeUser(socketID) {
        var user = document.getElementById("selector-" + socketID);
        if (user !== null) user.parentElement.removeChild(user);
    }

    //send message, clear message box and add message to local chat
    $("form").submit(function(e) {
        e.preventDefault();
        var text = $("#chat-input").val();
        var role = currentRole;
        if (text.replace(/\s+/g, "") !== "" && role !== undefined && role !== "None") {
            sendToServer(role, text);
            $("#chat-input").val("");
        }
        $("#chat-input").focus();
        return false;
    });

    //format the data, convert to string and send to server
    function sendToServer(role, msg) {
        var data = {
            sender: role,
            header: role + " " + timeNow(),
            timeStamp: timeNow(),
            message: msg
        };
        addMessageToLog(JSON.stringify(data)); //add to local log
        socket.emit("chat message", JSON.stringify(data));
    }

    //get the current target to transmit to
    $("#chat-target-container").on("click", ".chat-target-btn", function() {
        $(".chat-target-btn").removeClass("active-target");
        $(this).addClass("active-target");
    });

    //toggle mute for target
    $("#chat-target-container").on("click", ".mute-container", function() {
        //get the socketid that follows after mute- of continer id
        var socketID = $(this)
            .attr("id")
            .slice(5);
        if ($(this).hasClass("mute")) {
            $(this).html('<i class="mute-user fas fa-headphones">');
            $(this).removeClass("mute");
            //$("#audio-"+socketID).muted = false;
            $("#audio-" + socketID).prop("muted", false);
        } else {
            $(this).html('<i class="mute-user fas fa-volume-mute">');
            $(this).addClass("mute");
            //$("#audio-"+socketID).muted = true;
            $("#audio-" + socketID).prop("muted", true);
        }
    });

    //change the current role to selection and toggle the status lights
    $("#btn-select-role").click(function() {
        if (selectedRole !== null) currentRole = selectedRole;
        socket.emit("role change", socket.id, currentRole);
    });

    //get the selected role
    $("#modal-role-row").on("click", ".role-select-btn", function(e) {
        $(".role-select-btn").removeClass("active-role");
        $(this).addClass("active-role");
        selectedRole = this.id;
    });

    //deselect unsaved role and select chosen role after closing modal
    $("#modal-choose-role").on("hidden.bs.modal", function(e) {
        $(".role-select-btn").removeClass("active-role");
        $("#" + currentRole).addClass("active-role");
    });

    //show the jump to bottom button, unless we're at the bottom
    $("#chat-box").scroll(function(event) {
        var maxScroll = $(this)[0].scrollHeight - $(this).outerHeight();

        if (ingoreScroll === false) toggleJumpButton(true);
        ingoreScroll = false;
        event.preventDefault();

        if ($(this).scrollTop() >= maxScroll - maxScroll * 0.5) {
            toggleJumpButton(false);
        }
    });

    //jump to bottom of messages and hide the button
    $("#btn-jump").click(function() {
        $("#chat-box").scrollTop(
            $("#chat-box")[0].scrollHeight - $("#chat-box").outerHeight()
        );
        toggleJumpButton(false);
        ingoreScroll = true;
    });

    //toggle showing the button, true show false hide
    function toggleJumpButton(showButton) {
        if (showButton) {
            $("#btn-jump").removeClass("hide-btn");
            $("#btn-jump-arrow").removeClass("hide-btn");
        } else {
            $("#btn-jump").addClass("hide-btn");
            $("#btn-jump-arrow").addClass("hide-btn");
        }
    }

    //add messages to log
    function addMessageToLog(data) {
        var d = JSON.parse(data);
        var message = $('<li class="message-header message-group">').text(
            d.header
        );
        message.append($('<li class="message-content">').text(d.message));
        $("#messages").append(message);
        pruneMessages();
    }

    //get a timestamp
    function timeNow() {
        var d = new Date(),
            h = (d.getHours() < 10 ? "0" : "") + d.getHours(),
            m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
        return h + ":" + m + ": ";
    }

    //cap the number of loaded messages at 100 for now
    function pruneMessages() {
        var msgs = $("#messages").children();
        if (msgs!= null && msgs.length > 100)
            $("#messages").children().eq(0).remove();
    }
});
