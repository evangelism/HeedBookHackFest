

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

//Azure Storage Code -- Start

var Stream = require('stream');
var util = require('util');
var Buffer = require('buffer').Buffer;

function FileStream(file, opt) {
    Stream.Readable.call(this, opt);

    this.fileReader = new FileReader(file);
    this.file = file;
    this.size = file.size;
    this.chunkSize = 1024 * 1024 * 4; // 4MB
    this.offset = 0;
    var _me = this;

    this.fileReader.onloadend = function loaded(event) {
        var data = event.target.result;
        var buf = Buffer.from(data);
        _me.push(buf);
    }
}
util.inherits(FileStream, Stream.Readable);
FileStream.prototype._read = function () {
    if (this.offset > this.size) {
        this.push(null);
    } else {
        var end = this.offset + this.chunkSize;
        var slice = this.file.slice(this.offset, end);
        this.fileReader.readAsArrayBuffer(slice);
        this.offset = end;
    }
};

//some contants to comfig -- will be received from API after authentication and authorization in prod
var account = 'heedbookhackfest';
var sas = '';
var container = 'frames';
var blobUri = '';
var blobName = "NaN.png"
var dialogNumber = "13";
var checkMD5 = false;

function checkParameters() {

    if (account == null || account.length < 1) {
        alert('Please enter a valid storage account name!');
        return false;
    }
    if (sas == null || sas.length < 1) {
        alert('Please enter a valid SAS Token!');
        return false;
    }

    return true;
}

function getBlobService() {

    if (!checkParameters())
        return null;

    blobUri = 'https://' + account + '.blob.core.windows.net';
    var blobService = AzureStorage.createBlobServiceWithSas(blobUri, sas).withFilter(new AzureStorage.ExponentialRetryPolicyFilter());
    return blobService;
}

var HttpClient = function () {
    this.get = function (aUrl, aCallback) {
        var anHttpRequest = new XMLHttpRequest();
        anHttpRequest.onreadystatechange = function () {
            if (anHttpRequest.readyState == 4 && anHttpRequest.status == 200)
                aCallback(anHttpRequest.responseText);
        }

        anHttpRequest.open("GET", aUrl, true);
        anHttpRequest.send(null);
    }
}


//Azure Storage Code -- End

function takephoto() {
    var c = document.getElementById("canvas");
    var ctx = c.getContext("2d");
    c.getContext('2d').drawImage(gumVideo, 0, 0, 800, 600);
    var button = document.getElementById("takephotoimg");
    var dataURL = canvas.toDataURL("image/png");

    

    c.toBlob(function (blob) {

        
        var client = new HttpClient();
        client.get('http://heedbookwebapptest.azurewebsites.net/blob/BlobSas', function (response) {

            sas = response.toString();
         
            var blobService = getBlobService();
            if (!blobService)
                return;

            var fileStream = new FileStream(blob);

            if (!fileStream)
                return;
            
            // Make a smaller block size when uploading small blobs
            var blockSize = blob.size > 1024 * 1024 * 32 ? 1024 * 1024 * 4 : 1024 * 512;
            var options = {
                storeBlobContentMD5: checkMD5,
                blockSize: blockSize
            };
            blobService.singleBlobPutThresholdInBytes = blockSize;

            var date = new Date();

            blobName = dialogNumber + "-" + date.getFullYear().toString();
            var cur = date.getMonth();
            cur++;

            if (cur < 10) blobName = blobName + "0";
            blobName = blobName + cur.toString();

            cur = date.getDate();
            if (cur < 10) blobName = blobName + "0";

            blobName = blobName + cur.toString();

            cur = date.getHours();
            if (cur < 10) blobName = blobName + "0";
            blobName = blobName + cur.toString();

            cur = date.getMinutes();
            if (cur < 10) blobName = blobName + "0";
            blobName = blobName + cur.toString();

            cur = date.getSeconds();
            if (cur < 10) blobName = blobName + "0";
            blobName = blobName + cur.toString();

            blobName = blobName + ".jpg";


            var finishedOrError = false;
            var speedSummary = blobService.createBlockBlobFromStream(container, blobName, fileStream, blob.size, options, function (error, result, response) {
                finishedOrError = true;
                if (error) {
                    //can't upload
                    alert('Upload filed, open brower console for more detailed info.');
                    console.log(error);
                } else {
                    //add some function if we want to control on interact during uploading
                    setTimeout(function () { // Prevent alert from stopping UI progress update
                        alert('Upload successfully!');
                    }, 1000);
                }
            });

        });

        
    },"image/jpeg",0.95);

    button.href = dataURL;
    
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

