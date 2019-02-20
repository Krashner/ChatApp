 // Instantiate PeerConnection


 //var peer = new PeerConnection(socket);



//  // Setup peer methods
//  //setPeerMethod(peer);
//  function setPeerMethod(peer) {
//    // On incoming call
//     peer.onUserFound = function (messageData) {
//      // ...
//      // Handle UI for the incoming call
//      // ...
//      // On call accept
//      getUserMedia({ audio: true, video: true }, function (stream) {
//     //    peer.toUsername = callerUserId;
//     //    peer.fromUsername = loggedInUser.username;
//        peer.addStream(stream);
//     //    peer.sendParticipationRequest(callerUserId);
//      });
//    };
//    // Render media-stream elements for both caller and callee respectively
//    peer.onStreamAdded = function (e) {
//      //var media = e.mediaElement;
//      if (chatObject.data.callType == 'video') {

//      } else {
//     //    addAudio(media);
//      }
//    };
//    // Remove media-stream elements
//    peer.onStreamEnded = function (e) {
//    };
//  };

//  function addAudio() {
//     // var audio_id = video.getAttribute('id');
//     // if (audio_id == 'selfMedia') {
//     //   $('#selfVideoContainer').append(audio);
//     // } else {
//     //   if (chatObject.data.callTimer == 0) {
//     //     chatObject.data.callTimer = startTimer('callTimer');
//     //     peer.stopBroadcast();
//     //   }
//     //   $('#otherVideoContainer').append(audio);
//     // }
//     // // Show loading animation.
//     // var playPromise = video.play();
//     // if (playPromise !== undefined) {
//     //   playPromise.then(function (_) {
//     //     // Automatic playback started!
//     //     // Show playing UI.
//     //   }).catch(function (error) {
//     //     // Auto-play was prevented
//     //     // Show paused UI.
//     //   });
//     // }
//     // scaleVideos();
//  };