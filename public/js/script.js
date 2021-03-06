$(function () {
	const socket = io(); //socket connection to node server
	var peers = []; //array of peers to connect to
	var currentRole; //current chosen role
	var selectedRole; //selected role, saves to current role
	var localStream; //local mediastream object
	var ignoreLoad = false; //for preventing "load more messages button" when at top of database
	var canPrune = false; //for toggling pruning
	
	//******************************************************************
	// stream functions
	//******************************************************************

	//attempt to get the audio device and connect to peers
	function start() {
		peers = [];
		$("#chat-target-row").empty;
		currentRole = selectedRole = Cookies.get("role");
		if (currentRole == null) currentRole = selectedRole = "None";
		UpdateRole();
		getAudio();
		console.log("START", socket.id);
	}

	//manually retry on button press
	$("#reconnect-button").click(function (e) {
		if (localStream == null) {
			console.log("Attempting to get audio device.");
			getAudio();
		}
	});

	//toggle the connection icon on button
	function togglePhoneIcon(connected) {
		var icon = $("#connection-icon");
		if (connected) {
			icon.attr("class", "fas fa-phone");
		} else {
			icon.attr("class", "fas fa-phone-slash");
		}
	}

	//get the audio and connect to peers
	function getAudio() {
		navigator.mediaDevices
			.getUserMedia({
				audio: true,
				video: false
			})
			.then(function (stream) {
				localStream = stream;
				togglePhoneIcon(true);
				socket.emit("find peers");
			})
			.catch(function (err) {
				console.log(err.name + ": " + err.message);
				togglePhoneIcon(false);
				socket.emit("find peers");
			});
	}

	//******************************************************************
	// peer functions
	//******************************************************************

	//create a peer object and return it
	function createPeer(isInitiator, localSocket, remoteSocket, peerID) {
		var cloneStream;
		if (localStream != null) cloneStream = localStream.clone();
		var peer = new SimplePeer({
			initiator: isInitiator,
			trickle: false,
			//config: {"iceServers":[]}
			stream: cloneStream
		});

		//add some additional data for signal routing
		peer.remoteSocketID = remoteSocket;
		peer.initiatingPeerID = peerID;
		if (peer.initiatingPeerID === null) peer.initiatingPeerID = peer._id;

		setPeerListeners(peer);
		return peer;
	}

	function setPeerListeners(peer) {
		//send offer/answer to the target peer
		peer.on("signal", function (data) {
			console.log(data.type.toUpperCase(), "SENT", peer.remoteSocketID);

			//data for routing
			data.sendSignalTo = peer.remoteSocketID;
			data.signalOriginator = socket.id;
			data.initiatingPeerID = peer.initiatingPeerID;

			if (data.type == "offer") {
				socket.emit("peer offer", JSON.stringify(data));
			} else if (data.type == "answer") {
				socket.emit("peer answer", JSON.stringify(data));
			} else {
				console.log("ERROR: Unrecognized signal");
			}
		});

		//peer connected
		peer.on("connect", function () {
			console.log("CONNECT", peer.remoteSocketID);
			addUser(peer.remoteSocketID, "None");
			socket.emit("get role", peer.remoteSocketID);
			if (peer.initiator == true)
				socket.emit("peers connected", socket.id, peer.remoteSocketID);
			//addAudioElement(peer.remoteSocketID);
			//if (audio != null) audio.srcObject = stream;
		});

		//data channel is being used
		peer.on("data", function (data) {
			console.log("DATA", peer.remoteSocketID);
		});

		//streaming
		peer.on("stream", function (stream) {
			console.log("STREAM", peer.remoteSocketID);
			togglePeerTrack(peer, false);
			var audio = addAudioElement(peer.remoteSocketID);
			if (audio != null) audio.srcObject = stream;
			//togglePeerTrack(peer, false);
		});

		//close connection
		peer.on("close", function () {
			console.log("CLOSE", peer.remoteSocketID);
			removeUser(peer.remoteSocketID);
		});

		//error
		peer.on("error", function (err) {
			console.log("ERROR", err);
		});
	}

	//******************************************************************
	// socket functions
	//******************************************************************

	//start setting up the peer connections
	socket.on("connect", () => {
		start();
	});

	//create a new peer connection, if it doesn't already exist
	socket.on("create peer", (isInitiator, remoteSocketID) => {
		if (checkForPeer(remoteSocketID) == false) {
			console.log("CREATE INITIATOR PEER", socket.id);
			var p = createPeer(isInitiator, socket.id, remoteSocketID, null);
			peers.push(p);
		}
	});

	//check through array to see if a peer for the given socket exists
	function checkForPeer(socketID) {
		var exists = false;
		peers.forEach(function (peer) {
			if (peer.remoteSocketID === socketID) {
				exists = true;
			}
		});
		return exists;
	}

	//remove peer closed peer connection
	socket.on("remove peer", socketID => {
		tempPeers = [];
		for (var i = 0; i < peers.length; i++) {
			if (peers[i].remoteSocketID !== socketID) {
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

	//socket recieved a peer offer, create a non-initiating peer and send an answer to the sender
	socket.on("peer offer", data => {
		console.log("CREATE NON-INITIATOR PEER", socket.id);
		var d = JSON.parse(data);
		var p = createPeer(
			false,
			socket.id,
			d.signalOriginator,
			d.initiatingPeerID
		);
		console.log("OFFER RECIEVED", d.signalOriginator);
		p.signal(data);
		peers.push(p);
	});

	//socket recieved a peer answer, hive the answer to the peer object that sent the offer
	socket.on("peer answer", data => {
		var d = JSON.parse(data);
		console.log("ANSWER RECIEVED", d.signalOriginator);
		for (var i = 0; i < peers.length; i++) {
			if (peers[i]._id === d.initiatingPeerID) {
				peers[i].signal(data);
			}
		}
	});

	//update chat log with recieved message
	socket.on("chat message", data => {
		appendMessageToLog(data, false);
		//$("#notification-sound")[0].play();
	});

	//update chat log with all the previous message and add to bottom og log
	socket.on("retrieve log append", dataArr => {
		var arr = JSON.parse(dataArr);
		for (var i = 0; i < arr.length; i++) {
			var data = arr[i];
			appendMessageToLog(data, true);
		}
	});

	//update chat log with all the previous message and add to top of log
	socket.on("retrieve log prepend", dataArr => {
		var arr = JSON.parse(dataArr);
		arr = arr.reverse();
		for (var i = 0; i < arr.length; i++) {
			var data = arr[i];
			if (data.id == 1)
				ignoreLoad = true;
			prependMessageToLog(data, true);
		}
	});

	//signal that audio is being transmitted
	$("#chat-transmit-btn").mousedown(() => {
		var targets = getTransmitTargets();
		targets.forEach(target => {
			socket.emit("transmit light", socket.id, target, true);
		});
		transmitAudio(true);
	});

	//signal that audio is not being transmitted
	$("#chat-transmit-btn").mouseup(() => {
		stopTransmittingAudio();
	});

	//mouse left button, stop transmitting
	$("#chat-transmit-btn").mouseleave(() => {
		stopTransmittingAudio();
	});

	//end the transmission, change light color to red
	function stopTransmittingAudio() {
		var targets = getTransmitTargets();
		targets.forEach(target => {
			socket.emit("transmit light", socket.id, target, false);
		});
		transmitAudio(false);
	}

	//get the target to send audio to
	function getTransmitTargets() {
		var targetElements = $(".active-target");
		var targetIDs = [];

		//return the entire list of ids
		if (targetElements.attr("id") == "all-call-btn") {
			var allElements = $(".chat-target-btn");
			for (var i = 0; i < allElements.length; i++) {
				if (allElements[i].id.includes("selector-")) {
					targetIDs.push(allElements[i].id.slice(9));
				}
			}
		} else if (targetElements.length == 1) {
			targetIDs.push(targetElements.attr("id").slice(9));
		}
		return targetIDs;
	}

	//toggle to status light green/red for users transmitting
	socket.on("change light", (socketID, isOn) => {
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
	socket.on("role change", (socketID, role) => {
		$("#selector-" + socketID)
			.find(".chat-target-text")
			.text(role);
	});

	//recieve the user roles from server and clear out all previous arrays
	socket.on("update roles", roles => {
		for (var i = 0; i < peers.length; i++) peers[i].destroy();
		peers = [];
		$("#chat-target-container").empty();
		var container = $("#modal-role-row");
		var template = $("#role-template");
		$("#modal-role-row").empty();
		roles.forEach(function (role) {
			var newRole = template.clone();
			newRole.attr("id", role + "-Selector").html(role);
			newRole.appendTo(container).show();
		});
		$(".role-select-btn").removeClass("active-role");
		$("#" + currentRole + "-Selector").addClass("active-role");
		//show the modal if no role is selected
		if (currentRole == null || currentRole == "None")
			$("#modal-choose-role").modal("show");
	});

	//clear all messages from the chat log
	socket.on("clear messages", roles => {
		$("#messages").empty();
	});

	//******************************************************************
	// audio functions
	//******************************************************************

	//remove audio element
	function removeAudioElement(socketID) {
		var audio = document.getElementById("audio-" + socketID);
		if (audio !== null) audio.parentElement.removeChild(audio);
	}

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

	//gets the target socket to find the peer and toggles their stream track
	function transmitAudio(transmit) {
		var sockets = getTransmitTargets();
		sockets.forEach(socket => {
			var peer = findPeerBySocketID(socket);
			if (peer != null) {
				togglePeerTrack(peer, transmit);
			}
		});
	}

	//toggles the stream track on and off
	function togglePeerTrack(peer, status) {
		peer.streams.forEach(stream => {
			stream.getTracks().forEach(track => {
				track.enabled = status;
			});
		});
	}

	//find the peer from the array based on the socket id
	function findPeerBySocketID(socketID) {
		for (var i = 0; i < peers.length; i++) {
			if (peers[i].remoteSocketID == socketID) {
				return peers[i];
			}
		}
	}
	//******************************************************************
	// chat functions
	//******************************************************************

	//add user to user list
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

	//remove user from user list
	function removeUser(socketID) {
		var user = document.getElementById("selector-" + socketID);
		if (user !== null) user.parentElement.removeChild(user);
	}

	//send message, clear message box and add message to local chat
	$("form").submit(function (e) {
		e.preventDefault();
		var text = $("#chat-input").val();
		var role = currentRole;
		if (
			text.replace(/\s+/g, "") !== "" &&
			role !== undefined &&
			role !== "None"
		) {
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
			timeStamp: timeNow(),
			message: msg
		};
		appendMessageToLog(JSON.stringify(data)); //add to local log
		socket.emit("chat message", JSON.stringify(data));
	}

	//get the current target to transmit to
	$("#chat-target-container").on("click", ".chat-target-btn", function () {
		$(".chat-target-btn").removeClass("active-target");
		$(this).addClass("active-target");
	});

	//toggle all call chat
	$("#role-container").on("click", ".chat-target-btn", function () {
		$(".chat-target-btn").removeClass("active-target");
		$(this).addClass("active-target");
	});

	//toggle mute for target
	$("#chat-target-container").on("click", ".mute-container", function () {
		//get the socketid that follows after mute- of continer id
		var socketID = $(this)
			.attr("id")
			.slice(5);
		if ($(this).hasClass("mute")) {
			$(this).html('<i class="mute-user fas fa-headphones">');
			$(this).removeClass("mute");
			$("#audio-" + socketID).prop("muted", false);
		} else {
			$(this).html('<i class="mute-user fas fa-volume-mute">');
			$(this).addClass("mute");
			$("#audio-" + socketID).prop("muted", true);
		}
	});

	//change the current role to selection
	$("#btn-select-role").click(function () {
		UpdateRole();
	});

	//changes the role, saves the new role as a cookie and sends info to server
	function UpdateRole() {
		if (selectedRole !== "None") {
			$("#chat-input").prop("readonly", false);
			$("#chat-input").prop(
				"placeholder",
				"Send message as " + selectedRole + "..."
			);
		} else {
			$("#chat-input").prop("readonly", true);
			$("#chat-input").prop("placeholder", "Select a role to chat...");
		}
		currentRole = selectedRole;
		Cookies.set("role", currentRole);
		socket.emit("role change", socket.id, currentRole);
	}

	//get the selected role
	$("#modal-role-row").on("click", ".role-select-btn", function (e) {
		$(".role-select-btn").removeClass("active-role");
		$(this).addClass("active-role");
		selectedRole = $(this).text();
	});

	//deselect unsaved role and select chosen role after closing modal
	$("#modal-choose-role").on("hidden.bs.modal", function (e) {
		$(".role-select-btn").removeClass("active-role");
		$("#" + currentRole + "-Selector").addClass("active-role");
	});

	//show the jump to bottom button, unless we're at the bottom
	$("#chat-box").scroll(function (e) {
		var maxScroll = $(this)[0].scrollHeight - $(this).outerHeight();
		e.preventDefault();

		//hide the jump button
		if ($(this).scrollTop() <= maxScroll - maxScroll * 0.25) {
			toggleJumpButton(true);
		} else {
			toggleJumpButton(false);
		}

		//hide the load button
		if ($(this).scrollTop() <= maxScroll - maxScroll * 0.75 && ignoreLoad === false) {
			toggleLoadButton(true);
		} else {
			toggleLoadButton(false);
		}
	});

	//jump to bottom of messages and hide the button
	$("#btn-jump").click(() => {
		$("#chat-box").scrollTop(
			$("#chat-box")[0].scrollHeight - $("#chat-box").outerHeight()
		);
		canPrune = true;
		pruneMessages();
		toggleJumpButton(false);
	});

	//load more messages and hide the button
	$("#btn-load").click(() => {
		var topMesageGroup = $("#messages li:first");
		var header = topMesageGroup.children(".message-header").text();
		var text = header.split(" ");
		var sender = text[0];
		var timeStamp = text[1];
		var message = topMesageGroup.children(".message-content").text();

		var data = {
			sender: sender,
			timeStamp: timeStamp,
			message: message
		};

		canPrune = false;
		socket.emit("retrieve messages", JSON.stringify(data), 25);
		toggleLoadButton(false);
	});

	//toggle showing the jump button, true show false hide
	function toggleJumpButton(showButton) {
		if (showButton) {
			$("#btn-jump").removeClass("hide-btn");
			$("#btn-jump-arrow").removeClass("hide-btn");
		} else {
			$("#btn-jump").addClass("hide-btn");
			$("#btn-jump-arrow").addClass("hide-btn");
		}
	}

	//toggle showing the load more button, true show false hide
	function toggleLoadButton(showButton) {
		if (showButton) {
			$("#btn-load").removeClass("hide-btn");
			$("#btn-load-arrow").removeClass("hide-btn");
		} else {
			$("#btn-load").addClass("hide-btn");
			$("#btn-load-arrow").addClass("hide-btn");
		}
	}

	//add messages to log
	function appendMessageToLog(data, jsonData) {
		$("#messages").append(createMessage(data, jsonData));
		pruneMessages();
	}

	//add messages to log
	function prependMessageToLog(data, jsonData) {
		$("#messages").prepend(createMessage(data, jsonData));
		pruneMessages();
	}

	//create a message with the given data and return it
	function createMessage(data, jsonData) {
		var d = data;
		if (!jsonData) d = JSON.parse(data);
		var message = $('<li class="message-group">');
		message.append(
			$('<li class="message-header">').text(d.sender + " " + d.timeStamp)
		);
		message.append($('<li class="message-content">').text(d.message));
		return message;
	}

	//get a timestamp
	function timeNow() {
		var d = new Date(),
			h = (d.getHours() < 10 ? "0" : "") + d.getHours(),
			m = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();
		return h + ":" + m;
	}

	//cap the number of loaded messages at 100 for now
	function pruneMessages() {
		var msgs = $("#messages").children();
		if (msgs != null && msgs.length > 100 && canPrune) {
			console.log("PRUNING MESSAGES");
			while ($("#messages").children().length > 100) {
				$("#messages").children().eq(0).remove();
			}
		}
	}
});
