﻿

var mediaSource = new MediaSource();
mediaSource.addEventListener('sourceopen', handleSourceOpen, false);
var mediaRecorder;
var recordedBlobs;
var sourceBuffer;
var imageCapture;

var gumVideo = document.querySelector('video#gum');
var recordedVideo = document.querySelector('video#recorded');
var photo = document.getElementById('photo');
var canvas = document.getElementById('canvas');

var recordButton = document.querySelector('button#record');
var playButton = document.querySelector('button#play');
var downloadButton = document.querySelector('button#download');
var downloadaudioButton = document.querySelector('button#downloadaudio');
var takephotoButton = document.querySelector('button#takephoto');
var downloadphotoButton = document.querySelector('button#downloadphoto');
var wsButton = document.querySelector('button#ws');
recordButton.onclick = toggleRecording;
playButton.onclick = play;
downloadButton.onclick = download;
downloadaudioButton.onclick = downloadaudio;
//takephotoButton.onclick = takephoto;
downloadphotoButton.onclick = downloadphoto;
wsButton.onclick = wsconnect;


navigator.getUserMedia = navigator.getUserMedia ||
  navigator.webkitGetUserMedia || navigator.mozGetUserMedia;

var constraints = {
  audio: true,
  video: true
};

navigator.getUserMedia(constraints, successCallback, errorCallback);


function successCallback(stream) {
  console.log('getUserMedia() got stream: ', stream);
  window.stream = stream;
  if (window.URL) {
    gumVideo.src = window.URL.createObjectURL(stream);
  } else {
    gumVideo.src = stream;
  }
}

function errorCallback(error) {
  console.log('navigator.getUserMedia error: ', error);
}


function handleSourceOpen(event) {
  console.log('MediaSource opened');
  sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8"');
  console.log('Source buffer: ', sourceBuffer);
}

function handleDataAvailable(event) {
  if (event.data && event.data.size > 0) {
    recordedBlobs.push(event.data);
  }
}

function handleStop(event) {
  console.log('Recorder stopped: ', event);
}

function toggleRecording() {
  if (recordButton.textContent === 'Start Recording') {
    startRecording();
  } else {
    stopRecording();
    recordButton.textContent = 'Start Recording';
    playButton.disabled = false;
    downloadButton.disabled = false;
    downloadaudioButton.disabled = false;
  }
}

// The nested try blocks will be simplified when Chrome 47 moves to Stable
function startRecording() {
  var options = {mimeType: 'video/webm', bitsPerSecond: 100000};
  recordedBlobs = [];
  try {
    mediaRecorder = new MediaRecorder(window.stream, options);
  } catch (e0) {
    console.log('Unable to create MediaRecorder with options Object: ', e0);
    try {
      options = {mimeType: 'video/webm,codecs=vp9', bitsPerSecond: 100000};
      mediaRecorder = new MediaRecorder(window.stream, options);
    } catch (e1) {
      console.log('Unable to create MediaRecorder with options Object: ', e1);
      try {
        options = 'video/vp8'; // Chrome 47
        mediaRecorder = new MediaRecorder(window.stream, options);
      } catch (e2) {
        alert('App is not supported by this browser.\n\n' +
            'Try Firefox 29 or later, or Chrome 47 or later.');
        console.error('Exception while creating MediaRecorder:', e2);
        return;
      }
    }
  }
  console.log('Created MediaRecorder', mediaRecorder, 'with options', options);
  recordButton.textContent = 'Stop Recording';
  playButton.disabled = true;
  downloadButton.disabled = true;
  downloadaudioButton.disabled = true;
  mediaRecorder.onstop = handleStop;
  mediaRecorder.ondataavailable = handleDataAvailable;
  mediaRecorder.start(10); // collect 10ms of data
  console.log('MediaRecorder started', mediaRecorder);
}


function stopRecording() {
  mediaRecorder.stop();
  console.log('Recorded Blobs: ', recordedBlobs);
  recordedVideo.controls = true;
}

function play() {
  var superBuffer = new Blob(recordedBlobs, {type: 'video/webm'});
  recordedVideo.src = window.URL.createObjectURL(superBuffer);
}

function download() {
  var blob = new Blob(recordedBlobs, {type: 'video/webm'});
  var url = window.URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'test.webm';
  document.body.appendChild(a);
  a.click();
  setTimeout(function() {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

function downloadaudio() {
    var blob = new Blob(recordedBlobs, { type: 'audio/wav' });
    var url = window.URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'test.wav';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 100);
}


function takephoto2() {

    var ctx = canvas.getContext("2d");
    canvas.fillStyle = "#AAA";
    canvas.fillRect(0, 0, 800, 600);

    //var img = document.getElementById("scream");
    //ctx.drawImage(img, 10, 10);
    //canvas.getContext('2d').drawImage(gumVideo, 600, 800);
    //var button = document.getElementById('takephoto1');
    //var dataURL = canvas.toDataURL('image/png');
    //button.href = dataURL;
 }


function takephoto() {
    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
    c.getContext('2d').drawImage(gumVideo, 0, 0, 800, 600);
    var button = document.getElementById("takephotoimg");
    var dataURL = canvas.toDataURL("image/png");
    button.href = dataURL;

    //take a BLOB from canvas and push it to the Azure

    c.toBlob(function (blob) {

        uploadBlobByStream(blob, false);
        
        });
}

function wsconnect() {
    console.log('Trying to make ws connection');
    var ws = new WebSocket('wss://localhost:44314/ws');

    ws.onopen = function () {
        console.log('Connection is done!');
        ws.send("test");
    };

    ws.onmessage = function (str) {
        console.log("Someone sent: ", str);
    };

}

