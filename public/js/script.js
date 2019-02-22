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

  $('#record').change(function () {
    var audio = document.getElementById('audio');
    if (this.checked == 2)
      audio.volume = 1;
    else
      audio.volume = 0;

    console.log(audio.volume + this.checked);
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


  // const audio2 = document.querySelector('#audio2');

  // $("#idform").hide();
  // $("#dcform").hide();
  // $("#sendform").hide();

  // $("#idform").submit(setMyId);
  // $("#dcform").submit(connectTo);
  // $("#sendform").submit(sendDirect);

  // $("#setid").click(setMyId);
  // $("#dc-connect").click(connectTo);
  // $("#send").click(sendDirect);



  // var ws = null;
  // var user = "";
  // var user2 = "";
  // $("#ws-connect").click(function () {
  //   ws = new WebSocket("ws://127.0.0.1:8088");
  //   ws.onopen = function (e) {
  //     console.log("Websocket opened");
  //     $("#idform").show();
  //   }
  //   ws.onclose = function (e) {
  //     console.log("Websocket closed");
  //   }
  //   ws.onmessage = function (e) {
  //     console.log("Websocket message received: " + e.data);
  //     var json = JSON.parse(e.data);
  //     if (json.action == "candidate") {
  //       if (json.to == user) {
  //         processIce(json.data);
  //       }
  //     } else if (json.action == "offer") {
  //       // incoming offer
  //       if (json.to == user) {
  //         user2 = json.from;
  //         processOffer(json.data)
  //       }
  //     } else if (json.action == "answer") {
  //       // incoming answer
  //       if (json.to == user) {
  //         processAnswer(json.data);
  //       }
  //     }
  //     // else if(json.action == "id"){
  //     //    userId = json.data;
  //     // } else if(json.action=="newUser"){
  //     //     if(userId!=null && json.data!=userId){
  //     //     }
  //     // }
  //   }
  //   ws.onerror = function (e) {
  //     console.log("Websocket error");
  //   }
  // });
  // function setMyId(e) {
  //   e.preventDefault();
  //   user = $("#user").val();
  //   $("#dcform").show();
  //   return false;
  // }
  // var config = { "iceServers": [{ "url": "stun:stun.l.google.com:19302" }] };
  // var connection = {};
  // var peerConnection;
  // var dataChannel;
  // function connectTo(e) {
  //   e.preventDefault();
  //   user2 = $("#connectTo").val();
  //   openDataChannel();
  //   var sdpConstraints = { offerToReceiveAudio: true, offerToReceiveVideo: false }
  //   peerConnection.createOffer(sdpConstraints).then(function (sdp) {
  //     peerConnection.setLocalDescription(sdp);
  //     sendNegotiation("offer", sdp);
  //     console.log("------ SEND OFFER ------");
  //   }, function (err) {
  //     console.log(err)
  //   });
  // }
  // function sendDirect(e) {
  //   e.preventDefault();
  //   dataChannel.send($("#message").val());
  //   $('body').append('Me: <div class="message">' + $("#message").val() + '</div>');
  //   console.log("Sending over datachannel: " + $("#message").val());
  //   $("#message").val('');
  // }
  // function getURLParameter(name) {
  //   return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [, ""])[1].replace(/\+/g, '%20')) || null
  // }
  // function openDataChannel() {
  //   peerConnection = new webkitRTCPeerConnection(config, connection);
  //   peerConnection.onicecandidate = function (e) {
  //     if (!peerConnection || !e || !e.candidate) return;
  //     var candidate = event.candidate;
  //     sendNegotiation("candidate", candidate);
  //   }
  //   dataChannel = peerConnection.createDataChannel("datachannel", { reliable: false });
  //   dataChannel.onopen = function () {
  //     console.log("------ DATACHANNEL OPENED ------")
  //     $("#sendform").show();
  //   };
  //   dataChannel.onclose = function () { console.log("------ DC closed! ------") };
  //   dataChannel.onerror = function () { console.log("DC ERROR!!!") };
  //   peerConnection.ondatachannel = function (ev) {
  //     console.log('peerConnection.ondatachannel event fired.');
  //     ev.channel.onopen = function () {
  //       console.log('Data channel is open and ready to be used.');
  //       testAudio();
  //     };
  //     ev.channel.onmessage = function (e) {
  //       console.log("DC from [" + user2 + "]:" + e.data);
  //       $('body').append(user2 + ': <div class="message from">' + e.data + '</div>')
  //     }
  //   };
  //   return peerConnection
  // }
  // function sendNegotiation(type, sdp) {
  //   var json = { from: user, to: user2, action: type, data: sdp };
  //   ws.send(JSON.stringify(json));
  //   console.log("Sending [" + user + "] to [" + user2 + "]: " + JSON.stringify(sdp));
  // }
  // function processOffer(offer) {
  //   var peerConnection = openDataChannel();
  //   peerConnection.setRemoteDescription(new RTCSessionDescription(offer)).catch(e => {
  //     console.log(e)
  //   });
  //   var sdpConstraints = {
  //     'mandatory':
  //     {
  //       'OfferToReceiveAudio': false,
  //       'OfferToReceiveVideo': false
  //     }
  //   };
  //   peerConnection.createAnswer(sdpConstraints).then(function (sdp) {
  //     return peerConnection.setLocalDescription(sdp).then(function () {
  //       sendNegotiation("answer", sdp);
  //       console.log("------ SEND ANSWER ------");
  //     })
  //   }, function (err) {
  //     console.log(err)
  //   });
  //   console.log("------ PROCESSED OFFER ------");

  // };
  // function processAnswer(answer) {
  //   peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  //   console.log("------ PROCESSED ANSWER ------");
  //   return true;
  // };
  // function processIce(iceCandidate) {
  //   peerConnection.addIceCandidate(new RTCIceCandidate(iceCandidate)).catch(e => {
  //     debugger
  //     console.log(e)
  //   })
  // }

  // function testAudio() {
  //   // peerConnection.ontrack = gotRemoteStream;

  //   peerConnection.ontrack = e => {
  //     audi2.srcObject = e.streams[0];
  //     //hangupButton.disabled = false;
  //     return false;
  //   }

  //   // navigator.mediaDevices
  //   //   .getUserMedia({
  //   //     audio: true,
  //   //     video: false
  //   //   })
  //   //   .then(gotStream)
  //   //   .catch(e => {
  //   //     alert(`getUserMedia() error: ${e.name}`);
  //   //   });


  //   yourConn = peerConnection;
  //   navigator.webkitGetUserMedia({ video: false, audio: true }, function (myStream) {
  //     stream = myStream;

  //     //displaying local audio stream on the page
  //     audio2.src = stream[0];

  //     //using Google public stun server
  //     var configuration = {
  //       "iceServers": [{ "url": "stun:stun2.1.google.com:19302" }]
  //     };

  //     yourConn = new webkitRTCPeerConnection(configuration);

  //     // setup stream listening
  //     yourConn.addStream(stream);

  //     //when a remote user adds stream to the peer connection, we display it
  //     yourConn.onaddstream = function (e) {
  //       remoteAudio.src = e.stream[0];
  //     };

  //     // Setup ice handling
  //     yourConn.onicecandidate = function (event) {
  //       if (event.candidate) {
  //         send({
  //           type: "candidate",
  //           candidate: event.candidate
  //         });
  //       }
  //     };

  //   }, function (error) {
  //     console.log(error);
  //   });



  // }

  // const offerOptions = {
  //   offerToReceiveAudio: 1,
  //   offerToReceiveVideo: 0,
  //   voiceActivityDetection: false
  // };

  // function gotStream(stream) {
  //   console.log('Received local stream');
  //   localStream = stream;
  //   const audioTracks = localStream.getAudioTracks();
  //   if (audioTracks.length > 0) {
  //     console.log(`Using Audio device: ${audioTracks[0].label}`);
  //   }
  //   localStream.getTracks().forEach(track => peerConnection.addTrack(track, localStream));
  //   console.log('Adding Local Stream to peer connection');

  //   peerConnection.createOffer(offerOptions)
  //     .then(gotDescription1, onCreateSessionDescriptionError);
  // }
  // function gotDescription1(desc) {
  //   console.log(`Offer from pc1\n${desc.sdp}`);
  //   peerConnection.setLocalDescription(desc);
  // }

  // function onCreateSessionDescriptionError(error) {
  //   console.log(`Failed to create session description: ${error.toString()}`);
  // }



  // function gotRemoteStream(e) {
  //   if (audio2.srcObject !== e.streams[0]) {
  //     audio2.srcObject = e.streams[0];
  //     console.log('Received remote stream');
  //   }
  // }
  // const isOfferer = onlineUsers.length === 2;
  startWebRTC(true);

  function startWebRTC() {

    // pc = new RTCPeerConnection();

    // navigator.mediaDevices.getUserMedia({
    //   audio: true,
    //   video: true,
    // }).then(stream => {
    //   // Display your local video in #localVideo element
    //   localVideo.srcObject = stream;
    //   // Add your stream to be sent to the conneting peer
    //   stream.getTracks().forEach(track => pc.addTrack(track, stream));
    //   socket.emit('voice message', stream);
    //   console.log(stream);
    // }, onError);

    // var mediaConstraints = {
    //   audio: true,            // We want an audio track
    //   video: true             // ...and we want a video track
    // };

    // var desc = new RTCSessionDescription(sdp);

    // pc.setRemoteDescription(desc).then(function () {
    //   return navigator.mediaDevices.getUserMedia(mediaConstraints);
    // })
    //   .then(function (stream) {
    //     previewElement.srcObject = stream;

    //     stream.getTracks().forEach(track => pc.addTrack(track, stream));
    //   })

    var constraints = { audio: true };
    navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
      var mediaRecorder = new MediaRecorder(mediaStream);

      mediaRecorder.onstart = function (e) {
        this.chunks = [];
      };

      mediaRecorder.ondataavailable = function (e) {
        this.chunks.push(e.data);

        console.log("data");
      };

      mediaRecorder.onstop = function (e) {
        var blob = new Blob(this.chunks);
        var url = JSON.stringify(url);
        socket.emit('radio', { blob: blob, url: url });
      };

      mediaRecorder.onpause = function (e) {
        console.log("pause");

      }

      mediaRecorder.start();

      setInterval(function () {
        mediaRecorder.stop()
        mediaRecorder.start();
      }, 600);
    });

    socket.on('voice', function (arrayBuffer) {
      var blob = new Blob([arrayBuffer], { 'type': 'audio/webm;codecs=opus' });
      var audio = document.getElementById('audio');
      audio.src = window.URL.createObjectURL(blob);
      audio.play();
    });


    // navigator.getUserMedia({ video: true, audio: true }, loadCam, loadFail)

    function loadCam(stream) {
      localVideo.srcObject = stream;

      var media = new MediaRecorder(stream);
      media.ondataavailable = function (e) {
        socket.emit('radio', e.data);
      }


      media.start(1000);
      //logger("Cam is ok");
    }

    socket.on('radio-reciver', function (image) {

      var sourceStream = MediaSourceStream({  // Creates a writable stream
        mimeType: 'video/webm; codecs="opus,vp8"'
      })
      // image.pipe(sourceStream)
      sourceStream.write(image.buff);

      var img = document.getElementById('play');
      img.src = window.URL.createObjectURL(sourceStream.mediaSource);
      $('#logger').text(image);
    })


    function loadFail(e) {
      console.log(e);
    }

  }

  function onError(error) {
    console.error(error);
  };

});