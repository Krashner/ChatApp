var PeerConnection = function(socket){

// ...
 // Some customization in PeerConnection.js
 // ...
 StartBroadcasting = function (broadcastData) {
    // ...
    socket.send({
      userid: root.userid,
      broadcasting: true,
      broadcastData: broadcastData
    });
    // ...
  };
  // ...
  // ...
//   onStreamAdded: function (stream) {
//     // ...
//     var eType = 'video';
//     if (root.MediaStream && root.MediaStream.getVideoTracks && !root.MediaStream.getVideoTracks().length) {
//       eType = 'audio';
//     }
//     var mediaElement = document.createElement(eType);
//     mediaElement.id = 'callerMedia_' + root.participant;
//     mediaElement.preload = 'none';
//     mediaElement[isFirefox ? 'mozSrcObject' : 'src'] = isFirefox ? stream : window.URL.createObjectURL(stream);
//     mediaElement.autoplay = true;
//     mediaElement.controls = false;
//     // ...
  //}
  // ...
  function closePeerConnections() {
    // ...
    // To stop the media stream
    if (root.MediaStream) {
      root.MediaStream.getTracks().forEach(function (track) {
        return track.stop();
      });
    }
    // ...
  }
  // ...
  // if someone is broadcasting himself!
  // if (message.broadcasting && root.onUserFound) {
  //   var messageData = {
  //     userid: message.userid,
  //     callerName: message.broadcastData.callerName,
  //     callType: message.broadcastData.callType
  //   };
  //   root.onUserFound(messageData);
  // }
  // ...

}