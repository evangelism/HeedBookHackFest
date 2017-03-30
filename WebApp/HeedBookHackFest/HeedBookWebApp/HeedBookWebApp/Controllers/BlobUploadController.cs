using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;

namespace HeedBookWebApp.Controllers
{
    [Produces("application/json")]
    [Route("api/BlobUpload")]
    public class BlobUploadController : Controller
    {
        [HttpGet]
        public async Task<string> CreateBlob()
        {
            CloudStorageAccount storageAccount = new CloudStorageAccount(new Microsoft.WindowsAzure.Storage.Auth.StorageCredentials("heedbookhackfest", "jLpE/XdA68GG1ujG56UYLV2UtRthj1+/vHweaG+Zqbz2jEjRBz1xqX410wfJG/bHY1PW+6hUqmiBqDGTjPMEtg=="), true);
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();
            CloudBlobContainer container = blobClient.GetContainerReference("my-new-container");

            await container.CreateIfNotExistsAsync();

            return "my-new-container is created";
        }
    }
}