// Provides a Stream for a file in webpage, inheriting from NodeJS Readable stream.
var Stream = require('stream');
var util = require('util');
var Buffer = require('buffer').Buffer;

//some contants to comfig -- will be received from API after authentication and authorization in prod
var account = 'heedbookhackfest';
var sas = '';
var container = 'frames';
var blobUri = '';
var blobName = "stas_test.png"

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

            function uploadBlobByLocalFile(fileName, checkMD5) {
                var client = new HttpClient();
                client.get('http://heedbookwebapptest.azurewebsites.net/blob/BlobSas', function (response) {

                    sas = response.toString();

                    var blobService = getBlobService();
                    if (!blobService)
                        return;


                    var finishedOrError = false;
                    var speedSummary = blobService.createBlockBlobFromLocalFile(container, blobName, fileName, function (error, result, response) {
                        finishedOrError = true;
                        if (error) {
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

            }



            function uploadBlobByStream(checkMD5) {


                var client = new HttpClient();
                client.get('http://heedbookwebapptest.azurewebsites.net/blob/BlobSas', function (response) {

                    sas = response.toString();

                    var blobService = getBlobService();
                    if (!blobService)
                        return;

                    var fileStream = new FileStream(blob);

                    // Make a smaller block size when uploading small blobs
                    var blockSize = blob.size > 1024 * 1024 * 32 ? 1024 * 1024 * 4 : 1024 * 512;
                    var options = {
                        storeBlobContentMD5: checkMD5,
                        blockSize: blockSize
                    };
                    blobService.singleBlobPutThresholdInBytes = blockSize;

                    var finishedOrError = false;
                    var speedSummary = blobService.createBlockBlobFromStream(container, blobName, fileStream, blob.size, options, function (error, result, response) {
                        finishedOrError = true;
                        if (error) {
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

            };