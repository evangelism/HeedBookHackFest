using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;
using Microsoft.AspNetCore.Http;

namespace HeedBookWebApp.Controllers
{
    public class BlobController : Controller
    {

        [HttpGet]
        public async Task<string> BlobSas()
        {
            CloudStorageAccount storageAccount = new CloudStorageAccount(new Microsoft.WindowsAzure.Storage.Auth.StorageCredentials("heedbookhackfest", "jLpE/XdA68GG1ujG56UYLV2UtRthj1+/vHweaG+Zqbz2jEjRBz1xqX410wfJG/bHY1PW+6hUqmiBqDGTjPMEtg=="), true);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference("frames");

            SharedAccessBlobPolicy sasConstraints = new SharedAccessBlobPolicy();
            sasConstraints.SharedAccessExpiryTime = DateTime.UtcNow.AddHours(24);
            sasConstraints.Permissions = SharedAccessBlobPermissions.Write | SharedAccessBlobPermissions.List;

            //Generate the shared access signature on the container, setting the constraints directly on the signature.
            string sasContainerToken = container.GetSharedAccessSignature(sasConstraints);

            //Return the URI string for the container, including the SAS token.
            return sasContainerToken;
        }


        [HttpPost]
        public async Task<string> CreateBlob([FromBody] IFormFile img)
        {
            CloudStorageAccount storageAccount = new CloudStorageAccount(new Microsoft.WindowsAzure.Storage.Auth.StorageCredentials("heedbookhackfest", "jLpE/XdA68GG1ujG56UYLV2UtRthj1+/vHweaG+Zqbz2jEjRBz1xqX410wfJG/bHY1PW+6hUqmiBqDGTjPMEtg=="), true);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference("my-new-container");

            CloudBlockBlob blockBlob = container.GetBlockBlobReference("my-new-container");

            using (var fileStream = System.IO.File.OpenRead(@"C:/GitHub/HeedBook/HeedBook/src/HeedBookApp/wwwroot/Images/a9.jpg"))
            {
                await blockBlob.UploadFromStreamAsync(fileStream);
            }

            return "file is uploaded!";
        }
    }
}