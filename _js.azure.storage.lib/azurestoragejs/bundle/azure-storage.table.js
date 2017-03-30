// Azure Storage JavaScript Client Library 0.2.1-preview.3
// Copyright (c) Microsoft and contributors.  All rights reserved.

require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({4:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var AzureStorage = window.AzureStorage || {};

AzureStorage.generateDevelopmentStorageCredentials = function (proxyUri) {
  var devStore = 'UseDevelopmentStorage=true;';
  if(proxyUri){
    devStore += 'DevelopmentStorageProxyUri=' + proxyUri;
  }

  return devStore;
};

var TableService = require('../lib/services/table/tableservice');
AzureStorage.TableService = TableService;
AzureStorage.TableQuery = require('../lib/services/table/tablequery');
AzureStorage.TableBatch = require('../lib/services/table/tablebatch');
AzureStorage.TableUtilities = require('../lib/services/table/tableutilities');

AzureStorage.createTableService = function (storageAccountOrConnectionString, storageAccessKey, host) {
  return new TableService(storageAccountOrConnectionString, storageAccessKey, host);
};

AzureStorage.createTableServiceWithSas = function (hostUri, sasToken) {
  return new TableService(null, null, hostUri, sasToken);
};

var azureCommon = require('../lib/common/common');
var StorageServiceClient = azureCommon.StorageServiceClient;
var SharedKey = azureCommon.SharedKey;

AzureStorage.generateAccountSharedAccessSignature = function(storageAccountOrConnectionString, storageAccessKey, sharedAccessAccountPolicy)
{
  var storageSettings = StorageServiceClient.getStorageSettings(storageAccountOrConnectionString, storageAccessKey);
  var sharedKey = new SharedKey(storageSettings._name, storageSettings._key);
  
  return sharedKey.generateAccountSignedQueryString(sharedAccessAccountPolicy);
};

AzureStorage.Constants = azureCommon.Constants;
AzureStorage.StorageUtilities = azureCommon.StorageUtilities;
AzureStorage.AccessCondition = azureCommon.AccessCondition;

AzureStorage.SR = azureCommon.SR;
AzureStorage.StorageServiceClient = StorageServiceClient;
AzureStorage.Logger = azureCommon.Logger;
AzureStorage.WebResource = azureCommon.WebResource;
AzureStorage.Validate = azureCommon.validate;
AzureStorage.date = azureCommon.date;

// Other filters
AzureStorage.LinearRetryPolicyFilter = azureCommon.LinearRetryPolicyFilter;
AzureStorage.ExponentialRetryPolicyFilter = azureCommon.ExponentialRetryPolicyFilter;
AzureStorage.RetryPolicyFilter = azureCommon.RetryPolicyFilter;

window.AzureStorage = AzureStorage;
},{"../lib/common/common":5,"../lib/services/table/tablebatch":65,"../lib/services/table/tablequery":66,"../lib/services/table/tableservice":67,"../lib/services/table/tableutilities":68}],67:[function(require,module,exports){
(function (Buffer){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var util = require('util');
var extend = require('extend');
var _ = require('underscore');

var azureCommon = require('./../../common/common');
var azureutil = azureCommon.util;
var validate = azureCommon.validate;
var SR = azureCommon.SR;
var StorageServiceClient = azureCommon.StorageServiceClient;
var SharedKeyTable = require('./internal/sharedkeytable');
var RequestHandler = require('./internal/requesthandler');
var TableQuery = require('./tablequery');
var WebResource = azureCommon.WebResource;
var Constants = azureCommon.Constants;
var QueryStringConstants = Constants.QueryStringConstants;
var HeaderConstants = Constants.HeaderConstants;
var TableConstants = Constants.TableConstants;
var RequestLocationMode = Constants.RequestLocationMode;

// Models requires
var TableResult = require('./models/tableresult');
var entityResult = require('./models/entityresult');
var BatchResult = require('./models/batchresult');
var ServiceStatsParser = azureCommon.ServiceStatsParser;
var AclResult = azureCommon.AclResult;
var TableUtilities = require('./tableutilities');

/**
* Creates a new TableService object.
* If no connection string or storageaccount and storageaccesskey are provided,
* the AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_ACCESS_KEY environment variables will be used.
* @class
* The TableService object allows you to peform management operations with the Microsoft Azure Table Service.
* The Table Service stores data in rows of key-value pairs. A table is composed of multiple rows, and each row
* contains key-value pairs. There is no schema, so each row in a table may store a different set of keys.
*
* For more information on the Table Service, as well as task focused information on using it from a Node.js application, see
* [How to Use the Table Service from Node.js](http://azure.microsoft.com/en-us/documentation/articles/storage-nodejs-how-to-use-table-storage/).
* The following defaults can be set on the Table service.
* defaultTimeoutIntervalInMs                          The default timeout interval, in milliseconds, to use for request made via the Table service.
* defaultClientRequestTimeoutInMs                     The default timeout of client requests, in milliseconds, to use for the request made via the Table service.
* defaultMaximumExecutionTimeInMs                     The default maximum execution time across all potential retries, for requests made via the Table service.
* defaultLocationMode                                 The default location mode for requests made via the Table service.
* defaultPayloadFormat                                The default payload format for requests made via the Table service.
* useNagleAlgorithm                                   Determines whether the Nagle algorithm is used for requests made via the Table service.; true to use the  
*                                                     Nagle algorithm; otherwise, false. The default value is false.
* @constructor
* @extends {StorageServiceClient}
*
* @param {string} [storageAccountOrConnectionString]  The storage account or the connection string.
* @param {string} [storageAccessKey]                  The storage access key.
* @param {string|object} [host]                       The host address. To define primary only, pass a string. 
*                                                     Otherwise 'host.primaryHost' defines the primary host and 'host.secondaryHost' defines the secondary host.
* @param {string} [sasToken]                          The Shared Access Signature token.
* @param {string} [endpointSuffix]                    The endpoint suffix.
*/
function TableService(storageAccountOrConnectionString, storageAccessKey, host, sasToken, endpointSuffix) {
  var storageServiceSettings = StorageServiceClient.getStorageSettings(storageAccountOrConnectionString, storageAccessKey, host, sasToken, endpointSuffix);

  TableService['super_'].call(this,
    storageServiceSettings._name,
    storageServiceSettings._key,
    storageServiceSettings._tableEndpoint,
    storageServiceSettings._usePathStyleUri,
    storageServiceSettings._sasToken);

  if (this.anonymous) {
    throw new Error(SR.ANONYMOUS_ACCESS_BLOBSERVICE_ONLY);
  }

  if(this.storageAccount && this.storageAccessKey) {
    this.storageCredentials = new SharedKeyTable(this.storageAccount, this.storageAccessKey, this.usePathStyleUri);
  }

  this.defaultPayloadFormat = TableUtilities.PayloadFormat.MINIMAL_METADATA;
}

util.inherits(TableService, StorageServiceClient);

// Table service methods

/**
* Gets the service stats for a storage account’s Table service.
*
* @this {TableService}
* @param {object}         [options]                                       The request options.
* @param {LocationMode}   [options.locationMode]                          Specifies the location mode used to decide which location the request should be sent to. 
*                                                                         Please see StorageUtilities.LocationMode for the possible values.
* @param {int}            [options.timeoutIntervalInMs]                   The server timeout interval, in milliseconds, to use for the request.
* @param {int}            [options.clientRequestTimeoutInMs]              The timeout of client requests, in milliseconds, to use for the request.
* @param {int}            [options.maximumExecutionTimeInMs]              The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                         The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                         execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}         [options.clientRequestId]                       A string that represents the client request ID with a 1KB character limit.
* @param {bool}           [options.useNagleAlgorithm]                     Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                         The default value is false.
* @param {errorOrResult}  callback                                        `error` will contain information if an error occurs; 
*                                                                         otherwise `[result]{@link ServiceStats}` will contain the stats.
*                                                                         `response` will contain information related to this operation.
*/
TableService.prototype.getServiceStats = function (optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('getServiceStats', function (v) {
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  options.requestLocationMode = Constants.RequestLocationMode.PRIMARY_OR_SECONDARY;

  var webResource = WebResource.get()
    .withQueryOption(QueryStringConstants.COMP, 'stats')
    .withQueryOption(QueryStringConstants.RESTYPE, 'service');

  var processResponseCallback = function (responseObject, next) {
    responseObject.serviceStatsResult = null;
    if (!responseObject.error) {
      responseObject.serviceStatsResult = ServiceStatsParser.parse(responseObject.response.body.StorageServiceStats);
    }

    // function to be called after all filters
    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.serviceStatsResult, returnObject.response);
    };

    // call the first filter
    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

/**
* Gets the properties of a storage account’s Table service, including Azure Storage Analytics.
*
* @this {TableService}
* @param {object}             [options]                                    The request options.
* @param {LocationMode}       [options.locationMode]                       Specifies the location mode used to decide which location the request should be sent to. 
*                                                                          Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]           The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]           The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                          The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                          execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                    A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                  Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                          The default value is false.
* @param {errorOrResult}  callback                                         `error` will contain information if an error occurs; 
*                                                                          otherwise `[result]{@link ServiceProperties}` will contain the properties.
*                                                                         `response` will contain information related to this operation.
*/
TableService.prototype.getServiceProperties = function (optionsOrCallback, callback) {
  return this.getAccountServiceProperties(optionsOrCallback, callback);
};

/**
* Sets the properties of a storage account’s Table service, including Azure Storage Analytics.
* You can also use this operation to set the default request version for all incoming requests that do not have a version specified.
*
* @this {TableService}
* @param {object}             serviceProperties                            The service properties.
* @param {object}             [options]                                    The request options.
* @param {LocationMode}       [options.locationMode]                       Specifies the location mode used to decide which location the request should be sent to. 
*                                                                          Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]           The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]           The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                          The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                          execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                    A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                  Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                          The default value is false.
* @param {errorOrResponse}  callback                                       `error` will contain information if an error occurs; 
*                                                                          `response` will contain information related to this operation.
*/
TableService.prototype.setServiceProperties = function (serviceProperties, optionsOrCallback, callback) {
  return this.setAccountServiceProperties(serviceProperties, optionsOrCallback, callback);
};

/**
* Lists a segment containing a collection of table items under the specified account.
*
* @this {TableService}
* @param {object}             currentToken                                      A continuation token returned by a previous listing operation. Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                                         The create options or callback function.
* @param {int}                [options.maxResults]                              Specifies the maximum number of tables to return per call to Azure ServiceClient. 
* @param {LocationMode}       [options.locationMode]                            Specifies the location mode used to decide which location the request should be sent to. 
*                                                                               Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                     The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]                The timeout of client requests, in milliseconds, to use for the request.
* @param {string}             [options.payloadFormat]                           The payload format to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]                The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                               The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                               execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                         A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                       Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                               The default value is false.
* @param {errorOrResult}  callback                                              `error` will contain information if an error occurs; 
*                                                                               otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                               `entries`  gives a list of tables and the `continuationToken` is used for the next listing operation.
*                                                                               `response` will contain information related to this operation.
*/
TableService.prototype.listTablesSegmented = function (currentToken, optionsOrCallback, callback) {
  this.listTablesSegmentedWithPrefix(null /* prefix */, currentToken, optionsOrCallback, callback);
};

/**
* Lists a segment containing a collection of table items under the specified account.
*
* @this {TableService}
* @param {string}             prefix                                            The prefix of the table name.
* @param {object}             currentToken                                      A continuation token returned by a previous listing operation. Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                                         The create options or callback function.
* @param {int}                [options.maxResults]                              Specifies the maximum number of tables to return per call to Azure ServiceClient. 
* @param {LocationMode}       [options.locationMode]                            Specifies the location mode used to decide which location the request should be sent to. 
*                                                                               Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                     The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]                The timeout of client requests, in milliseconds, to use for the request.
* @param {string}             [options.payloadFormat]                           The payload format to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]                The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                               The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                               execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                         A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                       Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                               The default value is false.
* @param {errorOrResult}  callback                                              `error` will contain information if an error occurs; 
*                                                                               otherwise `result` will contain `entries` and `continuationToken`. 
*                                                                               `entries`  gives a list of tables and the `continuationToken` is used for the next listing operation.
*                                                                               `response` will contain information related to this operation.
*/
TableService.prototype.listTablesSegmentedWithPrefix = function (prefix, currentToken, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('listTables', function (v) {
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  options.payloadFormat = options.payloadFormat || this.defaultPayloadFormat;

  var webResource = WebResource.get(TableConstants.TABLE_SERVICE_TABLE_NAME);
  RequestHandler.setTableRequestHeadersAndBody(webResource, null, options.payloadFormat);

  if(!azureutil.objectIsNull(currentToken)) {
    webResource.withQueryOption(TableConstants.NEXT_TABLE_NAME, currentToken.nextTableName);
  }

  if(!azureutil.objectIsNull(prefix)) {
    var query = new TableQuery()
      .where(TableConstants.TABLE_NAME + ' >= ?', prefix)
      .and(TableConstants.TABLE_NAME + ' < ?', prefix + '{');
    
    webResource.withQueryOption(QueryStringConstants.FILTER, query.toQueryObject().$filter);
  }

  if(!azureutil.objectIsNull(options.maxResults)) {
    var query = new TableQuery().top(options.maxResults);
    webResource.withQueryOption(QueryStringConstants.TOP, query.toQueryObject().$top);
  }

  options.requestLocationMode = azureutil.getNextListingLocationMode(currentToken);

  var processResponseCallback = function (responseObject, next) {
    responseObject.listTablesResult = null;

    if (!responseObject.error) {
      responseObject.listTablesResult = {
        entries: null,
        continuationToken: null
      };
      responseObject.listTablesResult.entries = TableResult.parse(responseObject.response);

      if (responseObject.response.headers[TableConstants.CONTINUATION_NEXT_TABLE_NAME] &&
      !azureutil.objectIsEmpty(responseObject.response.headers[TableConstants.CONTINUATION_NEXT_TABLE_NAME])) {
        responseObject.listTablesResult.continuationToken = {
          nextTableName: null,
          targetLocation: null
        };

        responseObject.listTablesResult.continuationToken.nextTableName = responseObject.response.headers[TableConstants.CONTINUATION_NEXT_TABLE_NAME];
        responseObject.listTablesResult.continuationToken.targetLocation = responseObject.targetLocation;
      }
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.listTablesResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

// Table Methods

/**
* Gets the table's ACL.
*
* @this {TableService}
* @param {string}             table                                        The table name.
* @param {object}             [options]                                    The request options.
* @param {LocationMode}       [options.locationMode]                       Specifies the location mode used to decide which location the request should be sent to. 
*                                                                          Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]           The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]           The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                          The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                          execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                    A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                  Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                          The default value is false.
* @param {errorOrResult}  callback                                         `error` will contain information if an error occurs; 
*                                                                          otherwise `result` will contain the ACL information for the table. See `[AccessPolicy]{@link AccessPolicy}` for detailed information.
*                                                                          `response` will contain information related to this operation.
*/
TableService.prototype.getTableAcl = function (table, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('getTableAcl', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  options.requestLocationMode = Constants.RequestLocationMode.PRIMARY_OR_SECONDARY;

  var webResource = WebResource.get(table)
    .withQueryOption(QueryStringConstants.COMP, 'acl');

  var processResponseCallback = function (responseObject, next) {
    responseObject.tableResult = null;
    if (!responseObject.error) {
      responseObject.tableResult = new TableResult(table);
      responseObject.tableResult.signedIdentifiers = AclResult.parse(responseObject.response.body);
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.tableResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

/**
* Updates the table's ACL.
*
* @this {TableService}
* @param {string}                                 table                                        The table name.
* @param {Object.<string, AccessPolicy>}             signedIdentifiers                            The table ACL settings. See `[AccessPolicy]{@link AccessPolicy}` for detailed information.
* @param {object}                                 [options]                                    The request options.
* @param {LocationMode}                           [options.locationMode]                       Specifies the location mode used to decide which location the request should be sent to. 
*                                                                                              Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                                    [options.timeoutIntervalInMs]                The server timeout interval, in milliseconds, to use for the request.
* @param {int}                                    [options.clientRequestTimeoutInMs]           The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                                    [options.maximumExecutionTimeInMs]           The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                                              The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                                              execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}                                 [options.clientRequestId]                    A string that represents the client request ID with a 1KB character limit.
* @param {bool}                                   [options.useNagleAlgorithm]                  Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                                              The default value is false.
* @param {errorOrResult}                          callback                                     `error` will contain information if an error occurs; 
*                                                                                              otherwise `result` will contain information for the table.
*                                                                                              `response` will contain information related to this operation.
*/
TableService.prototype.setTableAcl = function (table, signedIdentifiers, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('setTableAcl', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);

  var policies = null;
  if (signedIdentifiers) {
    if(_.isArray(signedIdentifiers)) {
      throw new TypeError(SR.INVALID_SIGNED_IDENTIFIERS);
    }
    policies = AclResult.serialize(signedIdentifiers);
  }

  var webResource = WebResource.put(table)
    .withQueryOption(QueryStringConstants.COMP, 'acl')
    .withHeader(HeaderConstants.CONTENT_LENGTH, !azureutil.objectIsNull(policies) ? Buffer.byteLength(policies) : 0)
    .withBody(policies);

  var processResponseCallback = function (responseObject, next) {
    responseObject.tableResult = null;
    if (!responseObject.error) {

      // SetTableAcl doesn't actually return anything in the response
      responseObject.tableResult = new TableResult(table);
      if (signedIdentifiers) {
        responseObject.tableResult.signedIdentifiers = signedIdentifiers;
      }
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.tableResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, webResource.body, options, processResponseCallback);
};

/**
* Retrieves a shared access signature token.
*
* @this {TableService}
* @param {string}                   table                                               The table name.
* @param {object}                   sharedAccessPolicy                                  The shared access policy.
* @param {string}                   [sharedAccessPolicy.Id]                             The signed identifier.
* @param {object}                   [sharedAccessPolicy.AccessPolicy.Permissions]       The permission type.
* @param {date|string}              [sharedAccessPolicy.AccessPolicy.Start]             The time at which the Shared Access Signature becomes valid (The UTC value will be used).
* @param {date|string}              [sharedAccessPolicy.AccessPolicy.Expiry]            The time at which the Shared Access Signature becomes expired (The UTC value will be used).
* @param {string}                   [sharedAccessPolicy.AccessPolicy.IPAddressOrRange]  An IP address or a range of IP addresses from which to accept requests. When specifying a range, note that the range is inclusive.
* @param {string}                   [sharedAccessPolicy.AccessPolicy.Protocols]         The protocols permitted for a request made with the account SAS. 
*                                                                                       Possible values are both HTTPS and HTTP (https,http) or HTTPS only (https). The default value is https,http.
* @param {string}                   [sharedAccessPolicy.AccessPolicy.StartPk]           The starting Partition Key for which the SAS will be valid.
* @param {string}                   [sharedAccessPolicy.AccessPolicy.EndPk]             The ending Partition Key for which the SAS will be valid.
* @param {string}                   [sharedAccessPolicy.AccessPolicy.StartRk]           The starting Row Key for which the SAS will be valid.
* @param {string}                   [sharedAccessPolicy.AccessPolicy.EndRk]             The ending Row Key for which the SAS will be valid.
* @return {object}                                                                      An object with the shared access signature.
*/
TableService.prototype.generateSharedAccessSignature = function (table, sharedAccessPolicy) {
  // check if the TableService is able to generate a shared access signature
  if (!this.storageCredentials || !this.storageCredentials.generateSignedQueryString) {
    throw new Error(SR.CANNOT_CREATE_SAS_WITHOUT_ACCOUNT_KEY);
  }

  validate.validateArgs('generateSharedAccessSignature', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.object(sharedAccessPolicy, 'sharedAccessPolicy');
  });
  
  var lowerCasedTableName = table.toLowerCase();
  return this.storageCredentials.generateSignedQueryString(Constants.ServiceType.Table, lowerCasedTableName, sharedAccessPolicy, null, { tableName: lowerCasedTableName });
};

/**
* Checks whether or not a table exists on the service.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the table information including `exists` boolean member. 
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.doesTableExist = function (table, optionsOrCallback, callback) {
  this._doesTableExist(table, false, optionsOrCallback, callback);
};

/**
* Creates a new table within a storage account.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the new table information.
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.createTable = function (table, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('createTable', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);

  var tableDescriptor = TableResult.serialize(table);

  var webResource = WebResource.post('Tables')
    .withHeader(HeaderConstants.PREFER, HeaderConstants.PREFER_NO_CONTENT);

  RequestHandler.setTableRequestHeadersAndBody(webResource, tableDescriptor, this.defaultPayloadFormat);

  var processResponseCallback = function (responseObject, next) {
    responseObject.tableResponse = {};
    responseObject.tableResponse.isSuccessful = responseObject.error ? false : true;
    responseObject.tableResponse.statusCode = responseObject.response.statusCode;
    if (!responseObject.error) {
      responseObject.tableResponse.TableName = table;
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.tableResponse, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, webResource.body, options, processResponseCallback);
};

/**
* Creates a new table within a storage account if it does not exists.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     `result` will contain the table information including `created` boolean member
*                                                                     `response` will contain information related to this operation.
*
* @example
* var azure = require('azure-storage');
* var tableService = azure.createTableService();
* tableService.createTableIfNotExists('tasktable', function(error) {
*   if(!error) { 
*     // Table created or exists
*   }
* });
*/
TableService.prototype.createTableIfNotExists = function (table, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('createTableIfNotExists', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);

  var self = this;
  self._doesTableExist(table, true, options, function(error, result, response) {
    var exists = result.exists;
    result.created = false;
    delete result.exists;
    
    if (error) {
      callback(error, result, response);
    } else if (exists) {
      response.isSuccessful = true;
      callback(error, result, response);
    } else {
      self.createTable(table, options, function(createError, createResult, response) {
        if (!createError) {
          createResult.created = true;
        }
        else if (createError && createError.statusCode === Constants.HttpConstants.HttpResponseCodes.Conflict && createError.code === Constants.TableErrorCodeStrings.TABLE_ALREADY_EXISTS) {
          createError = null;
          createResult.created = false;
          createResult.isSuccessful = true;
        }
        callback(createError, createResult, response);
      });
    }
  });
};

/**
* Deletes a table from a storage account.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResponse}  callback                                  `error` will contain information if an error occurs;
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.deleteTable = function (table, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('deleteTable', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);

  var webResource = WebResource.del('Tables(\'' + table + '\')');
  RequestHandler.setTableRequestHeadersAndBody(webResource, null, this.defaultPayloadFormat);

  var processResponseCallback = function (responseObject, next) {
    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

/**
* Deletes a table from a storage account, if it exists.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     `result` will be `true` if table was deleted, false otherwise
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.deleteTableIfExists = function (table, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('deleteTableIfExists', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);

  var self = this;
  self._doesTableExist(table, true, options, function(error, result, response) {
    if (error) {
      callback(error, result.exists, response);
    } else if (!result.exists) {
      response.isSuccessful = true;
      callback(error, false, response);
    } else {
      self.deleteTable(table, options, function(deleteError, deleteResponse) {
        var deleted;
        if (!deleteError) {
          deleted = true;
        } else if (deleteError && deleteError.statusCode === Constants.HttpConstants.HttpResponseCodes.NotFound && deleteError.code === Constants.StorageErrorCodeStrings.RESOURCE_NOT_FOUND) {
          deleted = false;
          deleteError = null;
          deleteResponse.isSuccessful = true;
        }

        callback(deleteError, deleted, deleteResponse);
      });
    }
  });
};

// Table Entity Methods

/**
* Queries data in a table. To retrieve a single entity by partition key and row key, use retrieve entity.
*
* @this {TableService}
* @param {string}             table                                                The table name.
* @param {TableQuery}         tableQuery                                           The query to perform. Use null, undefined, or new TableQuery() to get all of the entities in the table.
* @param {object}             currentToken                                         A continuation token returned by a previous listing operation. 
*                                                                                  Please use 'null' or 'undefined' if this is the first operation.
* @param {object}             [options]                                            The request options.
* @param {LocationMode}       [options.locationMode]                               Specifies the location mode used to decide which location the request should be sent to. 
*                                                                                  Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                        The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]                   The timeout of client requests, in milliseconds, to use for the request.
* @param {string}             [options.payloadFormat]                              The payload format to use for the request.
* @param {bool}               [options.autoResolveProperties]                      If true, guess at all property types.
* @param {int}                [options.maximumExecutionTimeInMs]                   The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                                  The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                                  execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                            A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                          Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                                  The default value is false.
* @param {Function(entity)} [options.entityResolver]                               The entity resolver. Given a single entity returned by the query, returns a modified object which is added to 
*                                                                                  the entities array.
* @param {TableService~propertyResolver}  [options.propertyResolver]               The property resolver. Given the partition key, row key, property name, property value,
*                                                                                  and the property Edm type if given by the service, returns the Edm type of the property.
* @param {TableService~queryResponse} callback                                     `error` will contain information if an error occurs; 
*                                                                                  otherwise `entities` will contain the entities returned by the query. 
*                                                                                  If more matching entities exist, and could not be returned,
*                                                                                  `queryResultContinuation` will contain a continuation token that can be used
*                                                                                  to retrieve the next set of results.
*                                                                                  `response` will contain information related to this operation.
*
* The logic for returning entity types can get complicated.  Here is the algorithm used:
* ```
* var propertyType;
*
* if (propertyResovler) {                      // If the caller provides a propertyResolver in the options, use it
*   propertyType = propertyResolver(partitionKey, rowKey, propertyName, propertyValue, propertyTypeFromService);
* } else if (propertyTypeFromService) {        // If the service provides us a property type, use it.  See below for an explanation of when this will and won't occur.
*   propertyType = propertyTypeFromService;
* } else if (autoResolveProperties) {          // If options.autoResolveProperties is set to true
*   if (javascript type is string) {           // See below for an explanation of how and why autoResolveProperties works as it does.
*     propertyType = 'Edm.String';
*   } else if (javascript type is boolean) {
*     propertyType = 'Edm.Boolean';
*   }
* }
*
* if (propertyType) {
*   // Set the property type on the property.
* } else {
*   // Property gets no EdmType. 
* }
* ```
* Notes:
* 
* * The service only provides a type if JsonFullMetadata or JsonMinimalMetadata is used, and if the type is Int64, Guid, Binary, or DateTime.
* * Explanation of autoResolveProperties:
*     * String gets correctly resolved to 'Edm.String'.
*     * Int64, Guid, Binary, and DateTime all get resolved to 'Edm.String.'  This only happens if JsonNoMetadata is used (otherwise the service will provide the propertyType in a prior step).
*     * Boolean gets correctly resolved to 'Edm.Boolean'.
*     * For both Int32 and Double, no type information is returned, even in the case of autoResolveProperties = true.  This is due to an
*          inability to distinguish between the two in certain cases.
*
* @example
* var azure = require('azure-storage');
* var tableService = azure.createTableService();
* // tasktable should already exist and have entities
* 
* // returns all entities in tasktable, and a continuation token for the next page of results if necessary
* tableService.queryEntities('tasktable', null, null \/*currentToken*\/, function(error, result) {
*   if(!error) { 
*     var entities = result.entities;
*     // do stuff with the returned entities if there are any
*   }
* });
* 
* // returns field1 and field2 of the entities in tasktable, and a continuation token for the next page of results if necessary
* var tableQuery = new TableQuery().select('field1', 'field2');
* tableService.queryEntities('tasktable', tableQuery, null \/*currentToken*\/, function(error, result) {
*   if(!error) { 
*     var entities = result.entities;
*     // do stuff with the returned entities if there are any
*   }
* });
*/
TableService.prototype.queryEntities = function (table, tableQuery, currentToken, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('queryEntities', function (v) {
    v.string(table, 'table');
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  options.payloadFormat = options.payloadFormat || this.defaultPayloadFormat;

  var webResource = WebResource.get(table);
  RequestHandler.setTableRequestHeadersAndBody(webResource, null, options.payloadFormat);

  if (tableQuery) {
    var queryString = tableQuery.toQueryObject();
    Object.keys(queryString).forEach(function (queryStringName) {
      webResource.withQueryOption(queryStringName, queryString[queryStringName]);
    });
  }

  if(!azureutil.objectIsNull(currentToken)) {
    webResource.withQueryOption(TableConstants.NEXT_PARTITION_KEY, currentToken.nextPartitionKey);
    webResource.withQueryOption(TableConstants.NEXT_ROW_KEY, currentToken.nextRowKey);
  }

  options.requestLocationMode = azureutil.getNextListingLocationMode(currentToken);

  var processResponseCallback = function (responseObject, next) {
    responseObject.queryEntitiesResult = null;
    if (!responseObject.error) {
      responseObject.queryEntitiesResult = {
        entries: null,
        continuationToken: null
      };

      // entries
      responseObject.queryEntitiesResult.entries = entityResult.parseQuery(responseObject.response, options.autoResolveProperties, options.propertyResolver, options.entityResolver);

      // continuation token
      var continuationToken = {
          nextPartitionKey: responseObject.response.headers[TableConstants.CONTINUATION_NEXT_PARTITION_KEY],
          nextRowKey: responseObject.response.headers[TableConstants.CONTINUATION_NEXT_ROW_KEY],
          targetLocation: responseObject.targetLocation
        };

      if (!azureutil.IsNullOrEmptyOrUndefinedOrWhiteSpace(continuationToken.nextPartitionKey)) {
        responseObject.queryEntitiesResult.continuationToken = continuationToken;
      }
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.queryEntitiesResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

/**
* Retrieves an entity from a table.
*
* @this {TableService}
* @param {string}             table                                           The table name.
* @param {string}             partitionKey                                    The partition key.
* @param {string}             rowKey                                          The row key.
* @param {object}             [options]                                       The request options.
* @param {LocationMode}       [options.locationMode]                          Specifies the location mode used to decide which location the request should be sent to. 
*                                                                             Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                   The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]              The timeout of client requests, in milliseconds, to use for the request.
* @param {string}             [options.payloadFormat]                         The payload format to use for the request.
* @param {bool}               [options.autoResolveProperties]                 If true, guess at all property types.
* @param {int}                [options.maximumExecutionTimeInMs]              The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                             The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                             execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                       A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                     Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                             The default value is false.
* @param {TableService~propertyResolver}  [options.propertyResolver]          The property resolver. Given the partition key, row key, property name, property value,
*                                                                             and the property Edm type if given by the service, returns the Edm type of the property.
* @param {Function(entity)} [options.entityResolver]                          The entity resolver. Given the single entity returned by the query, returns a modified object.
* @param {errorOrResult}  callback                                            `error` will contain information if an error occurs; 
*                                                                             otherwise `result` will be the matching entity.
*                                                                             `response` will contain information related to this operation.
*
* The logic for returning entity types can get complicated.  Here is the algorithm used:
* ```
* var propertyType;
*
* if (propertyResovler) {                      // If the caller provides a propertyResolver in the options, use it
*   propertyType = propertyResolver(partitionKey, rowKey, propertyName, propertyValue, propertyTypeFromService);
* } else if (propertyTypeFromService) {        // If the service provides us a property type, use it.  See below for an explanation of when this will and won't occur.
*   propertyType = propertyTypeFromService;
* } else if (autoResolveProperties) {          // If options.autoResolveProperties is set to true
*   if (javascript type is string) {           // See below for an explanation of how and why autoResolveProperties works as it does.
*     propertyType = 'Edm.String';
*   } else if (javascript type is boolean) {
*     propertyType = 'Edm.Boolean';
*   }
* }
*
* if (propertyType) {
*   // Set the property type on the property.
* } else {
*   // Property gets no EdmType. 
* }
* ```
* Notes:
* 
* * The service only provides a type if JsonFullMetadata or JsonMinimalMetadata is used, and if the type is Int64, Guid, Binary, or DateTime.
* * Explanation of autoResolveProperties:
*     * String gets correctly resolved to 'Edm.String'.
*     * Int64, Guid, Binary, and DateTime all get resolved to 'Edm.String.'  This only happens if JsonNoMetadata is used (otherwise the service will provide the propertyType in a prior step).
*     * Boolean gets correctly resolved to 'Edm.Boolean'.
*     * For both Int32 and Double, no type information is returned, even in the case of autoResolveProperties = true.  This is due to an
*          inability to distinguish between the two in certain cases.
*
* @example
* var azure = require('azure-storage');
* var tableService = azure.createTableService();
* tableService.retrieveEntity('tasktable', 'tasksSeattle', '1', function(error, serverEntity) {
*   if(!error) {
*     // Entity available in serverEntity variable
*   }
* });
*/
TableService.prototype.retrieveEntity = function (table, partitionKey, rowKey, optionsOrCallback, callback) {
  var entityDescriptor = { PartitionKey: {_: partitionKey, $: 'Edm.String'},
    RowKey: {_: rowKey, $: 'Edm.String'},
  };

  validate.validateArgs('retrieveEntity', function (v) {
    v.stringAllowEmpty(partitionKey, 'partitionKey');
    v.stringAllowEmpty(rowKey, 'rowKey');
  });

  this._performEntityOperation(TableConstants.Operations.RETRIEVE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Inserts a new entity into a table.
*
* @this {TableService}
* @param {string}             table                                           The table name.
* @param {object}             entityDescriptor                                The entity descriptor.
* @param {object}             [options]                                       The request options.
* @param {string}             [options.echoContent]                           Whether or not to return the entity upon a successful insert. Default to false.
* @param {string}             [options.payloadFormat]                         The payload format to use in the response, if options.echoContent is true.
* @param {LocationMode}       [options.locationMode]                          Specifies the location mode used to decide which location the request should be sent to. 
*                                                                             Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                   The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]              The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]              The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                             The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                             execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                       A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                     Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                             The default value is false.
* @param {TableService~propertyResolver}  [options.propertyResolver]          The property resolver. Only applied if echoContent is true. Given the partition key, row key, property name, 
*                                                                             property value, and the property Edm type if given by the service, returns the Edm type of the property.
* @param {Function(entity)} [options.entityResolver]                          The entity resolver. Only applied if echoContent is true. Given the single entity returned by the insert, returns 
*                                                                             a modified object.
* @param {errorOrResult}  callback                                            `error` will contain information if an error occurs; 
*                                                                             otherwise `result` will contain the entity information.
*                                                                             `response` will contain information related to this operation.
*
* @example
* var azure = require('azure-storage');
* var tableService = azure.createTableService();
* var task1 = {
*   PartitionKey : {'_': 'tasksSeattle', '$':'Edm.String'},
*   RowKey: {'_': '1', '$':'Edm.String'},
*   Description: {'_': 'Take out the trash', '$':'Edm.String'},
*   DueDate: {'_': new Date(2011, 12, 14, 12), '$':'Edm.DateTime'}
* };
* tableService.insertEntity('tasktable', task1, function(error) {
*   if(!error) {
*     // Entity inserted
*   }
* }); 
*/
TableService.prototype.insertEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.INSERT, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Inserts or updates a new entity into a table.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             entityDescriptor                        The entity descriptor.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the entity information.
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.insertOrReplaceEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.INSERT_OR_REPLACE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Replaces an existing entity within a table. To replace conditionally based on etag, set entity['.metadata']['etag'].
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             entityDescriptor                        The entity descriptor.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the entity information.
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.replaceEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.REPLACE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Updates an existing entity within a table by merging new property values into the entity. To merge conditionally based on etag, set entity['.metadata']['etag'].
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             entityDescriptor                        The entity descriptor. 
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the entity information.
*                                                                     response` will contain information related to this operation.
*/
TableService.prototype.mergeEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.MERGE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Inserts or updates an existing entity within a table by merging new property values into the entity.
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             entityDescriptor                        The entity descriptor.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResult}  callback                                    `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain the entity information.
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.insertOrMergeEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.INSERT_OR_MERGE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Deletes an entity within a table. To delete conditionally based on etag, set entity['.metadata']['etag'].
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {object}             entityDescriptor                        The entity descriptor.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {errorOrResponse}  callback                                  `error` will contain information if an error occurs; 
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype.deleteEntity = function (table, entityDescriptor, optionsOrCallback, callback) {
  this._performEntityOperation(TableConstants.Operations.DELETE, table, entityDescriptor, optionsOrCallback, callback);
};

/**
* Executes the operations in the batch.
*
* @this {TableService}
* @param {string}             table                                           The table name.
* @param {TableBatch}         batch                                           The table batch to execute.
* @param {object}             [options]                                       The create options or callback function.
* @param {LocationMode}       [options.locationMode]                          Specifies the location mode used to decide which location the request should be sent to. 
*                                                                             Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]                   The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]              The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]              The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                             The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                             execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]                       A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]                     Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                             The default value is false.
* @param {errorOrResult}  callback                                            `error` will contain information if an error occurs; 
*                                                                             otherwise `result` will contain responses for each operation executed in the batch;
*                                                                             `result.entity` will contain the entity information for each operation executed.
*                                                                             `result.response` will contain the response for each operations executed.
*                                                                             `response` will contain information related to this operation.
*/
TableService.prototype.executeBatch = function (table, batch, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('executeBatch', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.object(batch, 'batch');
    v.callback(callback);
  });

  if(!batch.hasOperations()) {
    throw new Error(SR.EMPTY_BATCH);
  }

  var options = extend(true, {}, userOptions);

  var batchResult = new BatchResult(this, table, batch.operations);
  var webResource = batchResult.constructWebResource();

  var body = batchResult.serialize();
  webResource.withBody(body);
  webResource.withHeader(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(body, 'utf8'));

  var processResponseCallback = function (responseObject, next) {
    var responseObjects = batchResult.parse(responseObject);

    var noError = true;
    // if the batch was unsuccesful, there will be a single response indicating the error
    if (responseObjects && responseObjects.length > 0) {
      responseObjects.forEach(function(item){
        if(noError && !item.response.isSuccessful){
          responseObject = item;
          noError = false;
        }
      });
    }
    
    if (noError) {
      responseObject.operationResponses = responseObjects;
    }

    var finalCallback = function (returnObject) {
      // perform final callback
      callback(returnObject.error, returnObject.operationResponses, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, webResource.body, options, processResponseCallback);
};

// Private methods

/**
* Checks whether or not a table exists on the service.
* @ignore
*
* @this {TableService}
* @param {string}             table                                   The table name.
* @param {string}             primaryOnly                             If true, the request will be executed against the primary storage location.
* @param {object}             [options]                               The request options.
* @param {LocationMode}       [options.locationMode]                  Specifies the location mode used to decide which location the request should be sent to. 
*                                                                     Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]           The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]      The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]      The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                     The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                     execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]               A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]             Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                     The default value is false.
* @param {Function(error, result, response)}  callback                `error` will contain information if an error occurs; 
*                                                                     otherwise `result` will contain
*                                                                     the table information including `exists` boolean member. 
*                                                                     `response` will contain information related to this operation.
*/
TableService.prototype._doesTableExist = function (table, primaryOnly, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('doesTableExist', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  
  if(primaryOnly === false) {
    options.requestLocationMode = RequestLocationMode.PRIMARY_OR_SECONDARY;
  }

  var webResource = WebResource.get('Tables(\'' + table + '\')');
  webResource.withHeader(HeaderConstants.ACCEPT, this.defaultPayloadFormat);

  var processResponseCallback = function (responseObject, next) {
    responseObject.tableResult = {};
    responseObject.tableResult.isSuccessful = responseObject.error ? false : true;
    responseObject.tableResult.statusCode = responseObject.response === null || responseObject.response === undefined ? undefined : responseObject.response.statusCode;
    responseObject.tableResult.TableName = table;
    
    if(!responseObject.error){
      responseObject.tableResult.exists = true;
    } else if (responseObject.error && responseObject.error.statusCode === Constants.HttpConstants.HttpResponseCodes.NotFound) {
      responseObject.error = null;
      responseObject.tableResult.exists = false;
      responseObject.response.isSuccessful = true;
    }

    var finalCallback = function (returnObject) {
      callback(returnObject.error, returnObject.tableResult, returnObject.response);
    };

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, null, options, processResponseCallback);
};

/**
* Peforms a table operation.
*
* @this {TableService}
* @param {string}             operation                           The operation to perform.
* @param {string}             table                               The table name.
* @param {object}             entityDescriptor                    The entity descriptor.
* @param {object}             [options]                           The create options or callback function.
* @param {string}             [options.echoContent]               Whether or not to return the entity upon a successful insert. Default to false.
* @param {string}             [options.payloadFormat]             The payload format to use for the request.
* @param {LocationMode}       [options.locationMode]              Specifies the location mode used to decide which location the request should be sent to. 
*                                                                 Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]       The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]  The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]  The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                 The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                 execution time is checked intermittently while performing requests, and before executing retries.
* @param {string}             [options.clientRequestId]           A string that represents the client request ID with a 1KB character limit.
* @param {bool}               [options.useNagleAlgorithm]         Determines whether the Nagle algorithm is used; true to use the Nagle algorithm; otherwise, false.
*                                                                 The default value is false.
* @param {errorOrResult}  callback                                `error` will contain information if an error occurs; 
*                                                                 otherwise `entity` will contain the entity information.
*                                                                 `response` will contain information related to this operation.
* @ignore
*/
TableService.prototype._performEntityOperation = function (operation, table, entityDescriptor, optionsOrCallback, callback) {
  var userOptions;
  azureutil.normalizeArgs(optionsOrCallback, callback, function (o, c) { userOptions = o; callback = c; });

  validate.validateArgs('entityOperation', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
    v.object(entityDescriptor, 'entityDescriptor');

    if(typeof entityDescriptor.PartitionKey !== 'string') {
      v.object(entityDescriptor.PartitionKey, 'entityDescriptor.PartitionKey');
      v.stringAllowEmpty(entityDescriptor.PartitionKey._, 'entityDescriptor.PartitionKey._');
    }
    
    if(typeof entityDescriptor.RowKey !== 'string') {
      v.object(entityDescriptor.RowKey, 'entityDescriptor.RowKey');
      v.stringAllowEmpty(entityDescriptor.RowKey._, 'entityDescriptor.RowKey._');
    }
    v.callback(callback);
  });

  var options = extend(true, {}, userOptions);
  options.payloadFormat = options.payloadFormat || this.defaultPayloadFormat;

  var webResource = RequestHandler.constructEntityWebResource(operation, table, entityDescriptor, options);

  var processResponseCallback = function (responseObject, next) {
    var finalCallback;
    if (operation === TableConstants.Operations.DELETE) {
      finalCallback = function (returnObject) {
        callback(returnObject.error, returnObject.response);
      };
    } else {
      responseObject.entityResponse = null;
      if (!responseObject.error) {
        responseObject.entityResponse = entityResult.parseEntity(responseObject.response, options.autoResolveProperties, options.propertyResolver, options.entityResolver);
      }

      finalCallback = function (returnObject) {
        callback(returnObject.error, returnObject.entityResponse, returnObject.response);
      };
    }

    next(responseObject, finalCallback);
  };

  this.performRequest(webResource, webResource.body, options, processResponseCallback);
};

/**
* Retrieves a table URL.
*
* @param {string}                   table                    The table name.
* @param {string}                   [sasToken]               The Shared Access Signature token.
* @param {boolean}                  [primary]                A boolean representing whether to use the primary or the secondary endpoint.
* @return {string}                                           The formatted URL string.
* @example
* var azure = require('azure-storage');
* var tableService = azure.createTableService();
* var sharedAccessPolicy = {
*   AccessPolicy: {
*     Permissions: azure.TableUtilities.SharedAccessPermissions.QUERY,
*     Start: startDate,
*     Expiry: expiryDate
*   },
* };
* 
* var sasToken = tableService.generateSharedAccessSignature(table, sharedAccessPolicy);
* var sasUrl = tableService.getUrl(table, sasToken);
*/
TableService.prototype.getUrl = function (table, sasToken, primary) {
  validate.validateArgs('getUrl', function (v) {
    v.string(table, 'table');
    v.tableNameIsValid(table);
  });

  return this._getUrl(table, sasToken, primary);
};

/**
* Given the partition key, row key, property name, property value,
* and the property Edm type if given by the service, returns the Edm type of the property.
* @typedef {function} TableService~propertyResolver
* @param {object} pk  The partition key.
* @param {object} rk  The row key.
* @param {string} name  The property name.
* @param {object} value The property value.
* @param {string} type  The EDM type.
*/

/** 
* Returns entities matched by a query.
* @callback TableService~queryResponse                                                                                
* @param {object} error                     If an error occurs, the error information.
* @param {object} entities                  The entities returned by the query.
* @param {object} queryResultContinuation   If more matching entities exist, and could not be returned,
*                                           a continuation token that can be used to retrieve more results.
* @param {object} response                  Information related to this operation.
*/

module.exports = TableService;
}).call(this,require("buffer").Buffer)
},{"./../../common/common":5,"./internal/requesthandler":60,"./internal/sharedkeytable":61,"./models/batchresult":62,"./models/entityresult":63,"./models/tableresult":64,"./tablequery":66,"./tableutilities":68,"buffer":"buffer","extend":431,"underscore":577,"util":"util"}],64:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var odataHandler = require('../internal/odatahandler');

function TableResult(name) {
  this.name = name;
}

TableResult.serialize = function (tableName) {
  return JSON.stringify({ TableName: tableName });
};

TableResult.parse = function (response) {
  var result = null;
  if (response.body) {
    result = odataHandler.parseJsonTables(response.body);
  }

  return result;
};

exports = module.exports = TableResult;
},{"../internal/odatahandler":59}],62:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var azureCommon = require('./../../../common/common');
var Md5Wrapper = require('./../../../common/md5-wrapper');
var StorageServiceClient = azureCommon.StorageServiceClient;
var WebResource = azureCommon.WebResource;
var Constants = azureCommon.Constants;
var HeaderConstants = Constants.HeaderConstants;
var TableConstants = Constants.TableConstants;

var RequestHandler = require('../internal/requesthandler');
var entityResult = require('./entityresult');

/**
* Creates a new BatchResult.
*
* @param {TableService}      tableService    The table service.
* @param {string}            table           The table name.
* @param {array}             operations      The array of batch operations.
* @constructor
* @ignore
*/
function BatchResult(tableService, table, operations) {
  this.tableService = tableService;
  this.table = table;
  this.operations = operations;
  this.batchBoundary = 'batch_' + BatchResult._getBoundary();
  this.changesetBoundary = 'changeset_' + BatchResult._getBoundary();
}

/**
* Gets a boundary string.
*
* @return {string}   The boundary string.
* @ignore
*/
BatchResult._getBoundary = function () {
  return (new Md5Wrapper().createMd5Hash()).update('' + (new Date()).getTime()).digest('hex');
};

/**
* Constructs the batch web request.
*
* @return {WebResource}   The batch WebResource.
* @ignore
*/
BatchResult.prototype.constructWebResource = function () {
  var webResource = WebResource.post('$batch')
    .withRawResponse(true);

  webResource.withHeader(HeaderConstants.CONTENT_TYPE, 'multipart/mixed; charset="utf-8"; boundary=' + this.batchBoundary);
  webResource.withHeader(HeaderConstants.DATA_SERVICE_VERSION, '3.0;');
  webResource.withHeader(HeaderConstants.MAX_DATA_SERVICE_VERSION, '3.0;NetFx');

  return webResource;
};

/**
* Serializes the batch web body.
*
* @return {string}      The serialized batch content.
* @ignore
*/
BatchResult.prototype.serialize = function () {
  var body = '--' + this.batchBoundary + '\n';
  
  if (this.operations.length === 1 && this.operations[0].type === TableConstants.Operations.RETRIEVE) {
    body += HeaderConstants.CONTENT_TYPE + ': application/http\n';
    body += HeaderConstants.CONTENT_TRANSFER_ENCODING + ': binary\n\n';
    body += this._serializeOperation(this.operations[0]);
  } else {
    body += HeaderConstants.CONTENT_TYPE + ': multipart/mixed;charset="utf-8";boundary=' + this.changesetBoundary + '\n\n';

    for (var i = 0; i < this.operations.length; i++) {
      body += '--' + this.changesetBoundary + '\n';
      body += HeaderConstants.CONTENT_TYPE + ': application/http\n';
      body += HeaderConstants.CONTENT_TRANSFER_ENCODING + ': binary\n\n';
      body += this._serializeOperation(this.operations[i], i) + '\n';
    }
    body += '--' + this.changesetBoundary + '--\n';
  } 
  body += '--' + this.batchBoundary + '--';

  return body;
};

/**
* Serializes a request within the batch.
*
* @param {object}       The operation to serialize.  
* @param {number}       The index of the operation in the operations arrray.
* @return {string}      The serialized operation content.
* @ignore
*/
BatchResult.prototype._serializeOperation = function (operation, count) {
  operation.options.payloadFormat = operation.options.payloadFormat || this.tableService.defaultPayloadFormat;
  var webResource = RequestHandler.constructEntityWebResource(operation.type, this.table, operation.entity, operation.options);

  if (count) {
    webResource.headers[HeaderConstants.CONTENT_ID] = count;
  }

  if (webResource.headers[HeaderConstants.CONTENT_TYPE]) {
    webResource.headers[HeaderConstants.CONTENT_TYPE] += 'type=entry';
  }

  this.tableService._setRequestUrl(webResource);

  var content = webResource.method + ' ' + webResource.uri + ' HTTP/1.1\n';

  Object.keys(webResource.headers).forEach(function (header) {
    content += header + ': ' + webResource.headers[header] + '\n';
  });

  content += '\n';
  content += webResource.body || '';

  return content;
};

/**
* Parses a batch response.
*
* @param {object} responseObject    The response object for the batch request.
* @return {array} An array with the processed / parsed responses.
*/
BatchResult.prototype.parse = function (responseObject) {
  var responses = null;
  if (responseObject && responseObject.response && responseObject.response.body &&
      typeof responseObject.response.body === 'string') {
    responses = [];
    var rawResponses = responseObject.response.body.split(TableConstants.CHANGESET_DELIMITER);

    if(rawResponses.length === 1) {
      rawResponses = responseObject.response.body.split(TableConstants.BATCH_DELIMITER);
    }

    var self = this;
    rawResponses.forEach(function (rawResponse) {
      // Find HTTP/1.1 CODE line
      var httpLocation = rawResponse.indexOf('HTTP/1.1');
      if (httpLocation !== -1) {
        rawResponse = rawResponse.substring(httpLocation);

        // valid response
        var response = self._parseOperation(rawResponse);
        responses.push(response);
      }
    });
  }

  return responses;
};

/**
* Parses a partial response.
*
* @param {string}      rawResponse      The raw, unparsed, http response from the server for the batch response.
* @return {object}      A response object.
*/
BatchResult.prototype._parseOperation = function (rawResponse) {
  var responseObject = {
    error: null,
    response: { }
  };

  // Split into multiple lines and process them
  var responseLines = rawResponse.split('\r\n');

  if (responseLines.length > 0) {
    // Retrieve response code
    var headers = responseLines.shift().split(' ');
    if (headers.length >= 2) {
      responseObject.response.statusCode = parseInt(headers[1]);
      responseObject.response.isSuccessful = WebResource.validResponse(responseObject.response.statusCode);
    }

    // Populate headers
    responseObject.response.headers = { };
    responseObject.response.body = '';

    var isBody = false;
    responseLines.forEach(function (line) {
      if (line === '' && !isBody) {
        isBody = true;
      } else if (isBody) {
        responseObject.response.body += line;
      } else {
        var headerSplit = line.indexOf(':');
        if (headerSplit !== -1) {
          responseObject.response.headers[line.substring(0, headerSplit).trim().toLowerCase()] = line.substring(headerSplit + 1).trim();
        }
      }
    });

    StorageServiceClient._parseResponse(responseObject.response, this.tableService.xml2jsSettings);
    if (!responseObject.response.isSuccessful) {
      responseObject.error = StorageServiceClient._normalizeError(responseObject.response.body, responseObject.response);
    }

    if (!responseObject.error) {
      var index = responseObject.response.headers[HeaderConstants.CONTENT_ID] || 0;
      var propertyResolver;
      var entityResolver;
      if (index && this.operations[index]) {
        var options = this.operations[index].options;
        propertyResolver = options.propertyResolver;
        entityResolver = options.entityResolver;
      } 
      responseObject.entity = entityResult.parseEntity(responseObject.response, propertyResolver, entityResolver);
    }
  }

  return responseObject;
};

module.exports = BatchResult;
},{"../internal/requesthandler":60,"./../../../common/common":5,"./../../../common/md5-wrapper":12,"./entityresult":63}],61:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var util = require('util');
var azureCommon = require('./../../../common/common');
var SharedKey = azureCommon.SharedKey;
var azureutil = azureCommon.util;
var Constants = azureCommon.Constants;
var HeaderConstants = Constants.HeaderConstants;
var QueryStringConstants = Constants.QueryStringConstants;

/**
* Creates a new SharedKeyTable object.
*
* @constructor
* @param {string} storageAccount    The storage account.
* @param {string} storageAccessKey  The storage account's access key.
* @param {bool}   usePathStyleUri   Boolean value indicating if the path, or the hostname, should include the storage account.
*/
function SharedKeyTable(storageAccount, storageAccessKey, usePathStyleUri) {
  SharedKeyTable['super_'].call(this,
    storageAccount,
    storageAccessKey,
    usePathStyleUri);
}

util.inherits(SharedKeyTable, SharedKey);

/**
* Signs a request with the Authentication header.
*
* @param {WebResource} The webresource to be signed.
* @param {function(error)}  callback  The callback function.
*/
SharedKeyTable.prototype.signRequest = function (webResource, callback) {
  var getvalueToAppend = function (value) {
    if (azureutil.objectIsNull(value)) {
      return '\n';
    } else {
      return value + '\n';
    }
  };

  var stringToSign =
      webResource.method + '\n' +
      getvalueToAppend(webResource.headers[HeaderConstants.CONTENT_MD5]) +
      getvalueToAppend(webResource.headers[HeaderConstants.CONTENT_TYPE]) +
      getvalueToAppend(webResource.headers[HeaderConstants.MS_DATE]) +
      this._getCanonicalizedResource(webResource);

  var signature = this.signer.sign(stringToSign);

  webResource.withHeader(HeaderConstants.AUTHORIZATION, 'SharedKey ' + this.storageAccount + ':' + signature);
  callback(null);
};

/*
* Retrieves the webresource's canonicalized resource string.
* @param {WebResource} webResource The webresource to get the canonicalized resource string from.
* @return {string} The canonicalized resource string.
*/
SharedKeyTable.prototype._getCanonicalizedResource = function (webResource) {
  var path = '/';
  if (webResource.path) {
    path = webResource.path;
  }

  var canonicalizedResource = '/' + this.storageAccount + path;

  var queryStringValues = webResource.queryString;
  if (queryStringValues[QueryStringConstants.COMP]) {
    canonicalizedResource += '?comp=' + queryStringValues[QueryStringConstants.COMP];
  }

  return canonicalizedResource;
};

module.exports = SharedKeyTable;
},{"./../../../common/common":5,"util":"util"}],60:[function(require,module,exports){
(function (Buffer){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var util = require('util');
var azureCommon = require('./../../../common/common');
var WebResource = azureCommon.WebResource;
var SR = azureCommon.SR;
var Constants = azureCommon.Constants;
var HeaderConstants = Constants.HeaderConstants;
var TableConstants = Constants.TableConstants;
var entityResult = require('../models/entityresult');

exports = module.exports;

/**
* Retrieves the entity path from the table name and an entity descriptor.
* @ignore
*
* @param {string}   table         The table name.
* @param {object}   entity        The entity descriptor.
* @return {string} The entity path.
*/
function getEntityPath (tableName, partitionKey, rowKey) {
  var path = '/' + tableName;

  if (typeof (partitionKey) === 'string' && typeof (rowKey) === 'string') {
    // Escape single quotes according to OData Protocol Specification: "single quotes within string literals are represented as two consecutive single quotes".
    partitionKey = partitionKey.replace(/'/g, '\'\'');
    rowKey = rowKey.replace(/'/g, '\'\'');
    path = path + '(PartitionKey=\'' + encodeURIComponent(partitionKey.toString('utf8')) + '\',RowKey=\'' + encodeURIComponent(rowKey.toString('utf8')) + '\')';
  } else {
    throw new Error(SR.INCORRECT_ENTITY_KEYS);
  }

  return path;
}

/**
* Constructs the web resource for a table operation.
*
* @param {string}             operation                           The operation to perform.
* @param {string}             table                               The table name.
* @param {object}             entityDescriptor                    The entity descriptor.
* @param {object}             [options]                           The create options or callback function.
* @param {boolean}            [options.checkEtag]                 Boolean value indicating weather the etag should be matched or not.
* @param {string}             [options.echoContent]               Whether or not to return the entity upon a successful insert. Default to false.
* @param {string}             [options.payloadFormat]             The payload format to use for the request.
* @param {LocationMode}       [options.locationMode]              Specifies the location mode used to decide which location the request should be sent to. 
*                                                                 Please see StorageUtilities.LocationMode for the possible values.
* @param {int}                [options.timeoutIntervalInMs]       The server timeout interval, in milliseconds, to use for the request.
* @param {int}                [options.clientRequestTimeoutInMs]  The timeout of client requests, in milliseconds, to use for the request.
* @param {int}                [options.maximumExecutionTimeInMs]  The maximum execution time, in milliseconds, across all potential retries, to use when making this request.
*                                                                 The maximum execution time interval begins at the time that the client begins building the request. The maximum
*                                                                 execution time is checked intermittently while performing requests, and before executing retries.
* @return {webResource}
*/
exports.constructEntityWebResource = function (operation, table, entityDescriptor, options) {
  var webResource = null;
  if (operation === TableConstants.Operations.INSERT) {
    webResource = WebResource.post(table)
      .withHeader(HeaderConstants.PREFER, options.echoContent ? HeaderConstants.PREFER_CONTENT : HeaderConstants.PREFER_NO_CONTENT);
  } else {
    var partitionKey;
    var rowKey;

    if (typeof (entityDescriptor.PartitionKey) === 'string') {
      partitionKey = entityDescriptor.PartitionKey;
    } else {
      partitionKey = entityDescriptor.PartitionKey[TableConstants.ODATA_VALUE_MARKER];
    }

    if (typeof (entityDescriptor.RowKey) === 'string') {
      rowKey = entityDescriptor.RowKey;
    } else {
      rowKey = entityDescriptor.RowKey[TableConstants.ODATA_VALUE_MARKER];
    }

    var path = getEntityPath(table, partitionKey, rowKey);

    if (operation === TableConstants.Operations.DELETE) {
      webResource = WebResource.del(path);
    } else if (operation === TableConstants.Operations.MERGE || operation === TableConstants.Operations.INSERT_OR_MERGE) {
      webResource = WebResource.merge(path);
    } else if (operation === TableConstants.Operations.REPLACE || operation === TableConstants.Operations.INSERT_OR_REPLACE) {
      webResource = WebResource.put(path);
    } else if (operation === TableConstants.Operations.RETRIEVE) {
      webResource = WebResource.get(path);
    } else {
      throw new Error(util.format(SR.INVALID_TABLE_OPERATION, operation));
    }
  }

  if (operation === TableConstants.Operations.DELETE || operation === TableConstants.Operations.REPLACE || operation === TableConstants.Operations.MERGE) {
    webResource.withHeader(HeaderConstants.IF_MATCH, entityResult.getEtag(entityDescriptor) || '*');
  }

  var entitySerializedDescriptor;
  if (!(operation === TableConstants.Operations.DELETE || operation === TableConstants.Operations.RETRIEVE)) {
    entitySerializedDescriptor = entityResult.serialize(entityDescriptor);
  }

  exports.setTableRequestHeadersAndBody(webResource, entitySerializedDescriptor, options.payloadFormat);

  return webResource;
};

/**
* Sets the table request headers.
*
* @param {string}             webResource       The webResource to add headers to.
* @param {object}             [body]            The body of the request.
*/
exports.setTableRequestHeadersAndBody = function (webResource, body, acceptType) {
  if (body) {
    webResource.withHeader(HeaderConstants.CONTENT_LENGTH, Buffer.byteLength(body, 'utf8'))
      .withBody(body)
      .withHeader(HeaderConstants.CONTENT_TYPE, HeaderConstants.JSON_CONTENT_TYPE_VALUE);
  }

  webResource.withHeader(HeaderConstants.ACCEPT, acceptType)
    .withHeader(HeaderConstants.MAX_DATA_SERVICE_VERSION, TableConstants.DEFAULT_DATA_SERVICE_VERSION);
};
}).call(this,require("buffer").Buffer)
},{"../models/entityresult":63,"./../../../common/common":5,"buffer":"buffer","util":"util"}],63:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var azureCommon = require('./../../../common/common');
var Constants = azureCommon.Constants;
var TableConstants = Constants.TableConstants;
var HeaderConstants = Constants.HeaderConstants;
var odataHandler = require('../internal/odatahandler');

exports = module.exports;

exports.serialize = function (entity) {
  return odataHandler.serializeJson(entity);
};

exports.parseQuery = function (response, autoResolveProperties, propertyResolver, entityResolver) {
  var result = {};
  if (response.body) {
    result = odataHandler.parseJsonEntities(response.body, autoResolveProperties, propertyResolver, entityResolver);
  }

  return result;
};

exports.parseEntity = function (response, autoResolveProperties, propertyResolver, entityResolver) {
  var result = {};
  if (response.body) {
    result = odataHandler.parseJsonSingleEntity(response.body, autoResolveProperties, propertyResolver, entityResolver);
  }

  if (response.headers && response.headers[HeaderConstants.ETAG.toLowerCase()]) {
    if (!result[TableConstants.ODATA_METADATA_MARKER]) {
      result[TableConstants.ODATA_METADATA_MARKER] = {};
    }

    result[TableConstants.ODATA_METADATA_MARKER].etag = response.headers[HeaderConstants.ETAG.toLowerCase()];
  }

  return result;
};

exports.getEtag = function (entity) {
  var etag;
  if (entity && entity[TableConstants.ODATA_METADATA_MARKER]) {
    etag = entity[TableConstants.ODATA_METADATA_MARKER].etag;
  } 
  return etag;
};
},{"../internal/odatahandler":59,"./../../../common/common":5}],59:[function(require,module,exports){
(function (Buffer){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var util = require('util');

var azureCommon = require('./../../../common/common');
var azureutil = azureCommon.util;
var SR = azureCommon.SR;
var Constants = azureCommon.Constants;
var edmHandler = require('./edmhandler');

var prefixLength = Constants.TableConstants.ODATA_PREFIX.length;
var suffixLength = Constants.TableConstants.ODATA_TYPE_SUFFIX.length;

exports = module.exports;

/* Serialize an entity to an Odata (Json based) payload
* Input must be in the following format:
* { stringValue: { '$': 'Edm.String', '_': 'my string' }, myInt: { '$': 'Edm.Int32', '_': 3 } }
*/
exports.serializeJson = function (entity) {
  function normalizeEntityProperty(property) {
    if(azureutil.objectIsNull(property)) {
      return { _: property };
    }

    if (typeof property === 'object' && property.hasOwnProperty(Constants.TableConstants.ODATA_VALUE_MARKER)) {
      return property;
    }

    var result = { _: property };
    result[Constants.TableConstants.ODATA_TYPE_MARKER] = edmHandler.propertyType(property, true);

    return result;
  }

  var result = {};
  for (var propName in entity) {
    // ignore if .metadata or null or undefined
    if (propName !== Constants.TableConstants.ODATA_METADATA_MARKER) {
      var property = normalizeEntityProperty(entity[propName]);
      if (!azureutil.objectIsNull(property[Constants.TableConstants.ODATA_VALUE_MARKER])) {
        var value = property[Constants.TableConstants.ODATA_VALUE_MARKER];
        var type = property[Constants.TableConstants.ODATA_TYPE_MARKER];

        if (type === undefined) {
          type = edmHandler.propertyType(value, true);
        }

        result[propName] = edmHandler.serializeValue(type, value);
        if (edmHandler.isTypeRequired(type, value)) {
          result[propName + Constants.TableConstants.ODATA_TYPE_SUFFIX] = type;
        }
      }
    } 
  }

  var replacer = function(key, value) {
    if (value === Number.POSITIVE_INFINITY) {
      return 'Infinity';
    }
    if (value === Number.NEGATIVE_INFINITY) {
      return '-Infinity';
    }
    if (azureutil.objectIsNaN(value)) {
      return 'NaN';
    }
    return value;
  };
  
  return JSON.stringify(result, replacer);
};

/*
Input: The body of the HTTP response from the server from a table list as JSON (responseObject.response.body).

Return:
This will return an array in the following format:

[
  tableName1,
  tableName2
]

For example,

[
  myTable1,
  myTable2
]

*/
exports.parseJsonTables = function (response) {
  var result = [];

  if (response.value) {
    for (var i = 0; i < response.value.length; i++) {
      var entity = response.value[i].TableName;
      result.push(entity);
    }
  }

  return result;
};

/*
Input: The body of the HTTP response from the server from a table query as JSON (responseObject.response.body).

Return:
This will return an array in the following format:

[
  {{ '$': edmHandler1, '_': value1}, { '$': edmHandler2, '_': value2}, { '$': edmHandler3, '_': value3}},
  {{ '$': edmHandler4, '_': value4}, { '$': edmHandler5, '_': value5}, { '$': edmHandler6, '_': value6}}
]

For example,

[
  {{ '$': Edm.Int32, '_': 42}, { '$': Edm.String, '_': 'sample string'}, { '$': Edm.Boolean, '_': false}},
  {{ '$': Edm.Int64, '_': 42}, { '$': Edm.String, '_': 'sample string 2'}, { '$': Edm.Boolean, '_': true}}
]

*/
exports.parseJsonEntities = function (response, autoResolveProperties, propertyResolver, entityResolver) {
  if (!response.value) {
    return [exports.parseJsonSingleEntity(response, autoResolveProperties, propertyResolver, entityResolver)];
  } else {
    var result = [];

    for (var i = 0; i < response.value.length; i++) {
      var rawEntity = response.value[i];
      var entity = exports.parseJsonSingleEntity(rawEntity, autoResolveProperties, propertyResolver, entityResolver);
      result.push(entity);
    }

    return result;  
  }
};

exports.parseJsonSingleEntity = function(rawEntity, autoResolveProperties, propertyResolver, entityResolver) {
  var rawEntityProperties = {};
  var entityPropertyTypes = {PartitionKey: 'Edm.String', RowKey: 'Edm.String', Timestamp: 'Edm.DateTime'};
  var odataMetadata = {};

  // parse properties
  for (var entityPropertyName in rawEntity) {
    if (azureutil.stringStartsWith(entityPropertyName, Constants.TableConstants.ODATA_PREFIX)) {
      odataMetadata[entityPropertyName.slice(prefixLength)] = rawEntity[entityPropertyName];
    } else if (azureutil.stringEndsWith(entityPropertyName, Constants.TableConstants.ODATA_TYPE_SUFFIX)) {
      entityPropertyTypes[entityPropertyName.slice(0, entityPropertyName.length - suffixLength)] = rawEntity[entityPropertyName];
    } else {
      rawEntityProperties[entityPropertyName] = rawEntity[entityPropertyName];
    }
  }

  // make sure etag is set
  if (!odataMetadata.etag && rawEntityProperties.Timestamp) {
    var timestampString = new Buffer(rawEntityProperties.Timestamp).toString();
    odataMetadata.etag = 'W/"datetime\'' + timestampString + '\'"';
  }

  var entity = {};
  for (var entityPropertyName in rawEntityProperties) {
    if (rawEntityProperties.hasOwnProperty(entityPropertyName)) {
      // set the type, if given in the response
      var entityPropertyType = entityPropertyTypes[entityPropertyName];
      entity[entityPropertyName] = {};  

      // use the given property resolver if present, otherwise infer type if undefined
      if (propertyResolver) {
        // partition key, row key, name, value, type if present
        entityPropertyType = propertyResolver(rawEntityProperties.PartitionKey, rawEntityProperties.RowKey, entityPropertyName, rawEntityProperties[entityPropertyName], entityPropertyType);
      }
      if (!entityPropertyType && autoResolveProperties) {
        entityPropertyType = edmHandler.propertyType(rawEntityProperties[entityPropertyName], false);
      } 

      if (entityPropertyType) {
        entity[entityPropertyName][Constants.TableConstants.ODATA_TYPE_MARKER] = entityPropertyType;
      } 

      try {
        entity[entityPropertyName][Constants.TableConstants.ODATA_VALUE_MARKER] = edmHandler.deserializeValueFromJson(entityPropertyType, rawEntityProperties[entityPropertyName]);
      } catch (err) {
        if (propertyResolver) {
          // if a property resolver was used and the type is invalid, throw an appropriate error
          throw new Error(util.format(SR.INVALID_PROPERTY_RESOLVER, entityPropertyName, entityPropertyType, rawEntityProperties[entityPropertyName]));
        } else {
          throw err;
        }
      }
    }
  }

  entity[Constants.TableConstants.ODATA_METADATA_MARKER] = odataMetadata;

  if (entityResolver) {
    entity = entityResolver(entity);
  }

  return entity;
};

}).call(this,require("buffer").Buffer)
},{"./../../../common/common":5,"./edmhandler":58,"buffer":"buffer","util":"util"}],66:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var _ = require('underscore');
var util = require('util');

var azureCommon = require('./../../common/common');
var azureutil = azureCommon.util;
var SR = azureCommon.SR;
var QueryStringConstants =  azureCommon.Constants.QueryStringConstants;

var edmHandler = require('./internal/edmhandler');
var TableUtilities = require('./tableutilities');
var QueryComparisons = TableUtilities.QueryComparisons;
var TableOperators = TableUtilities.TableOperators;
var EdmType = TableUtilities.EdmType;

/**
 * Creates a new TableQuery object.
 *
 * @constructor
 */
function TableQuery() {
  this._fields = [];
  this._where = [];
  this._top = null;
}

/**
* Specifies the select clause. If no arguments are given, all fields will be selected.
*
* @param {array} fields The fields to be selected.
* @return {TableQuery} A table query object with the select clause.
* @example
* var tableQuery = new TableQuery().select('field1', 'field2');
*/
TableQuery.prototype.select = function () {
  var self = this;
  if (arguments) {
    _.each(arguments, function (argument) {
      self._fields.push(argument);
    });
  }

  return this;
};

/**
 * Specifies the top clause.
 *
 * @param {int} top The number of items to fetch.
 * @return {TableQuery} A table query object with the top clause.
 * @example
 * var tableQuery = new TableQuery().top(10);
 *
 * // tasktable should already exist and have entities
 * tableService.queryEntities('tasktable', tableQuery, null \/*currentToken*\/, function(error, result) {
 *   if(!error) { 
 *     var entities = result.entities; // there will be 10 or less entities
 *     // do stuff with the returned entities if there are any
 *     // if result.continuationToken exists, to get the next 10 (or less) entities
 *     // call queryEntities as above, but with the returned token instead of null
 *   }
 * });
 */
TableQuery.prototype.top = function (top) {
  this._top = top;
  return this;
};

/**
 * Specifies the where clause.
 *
 * Valid type specifier strings include: ?string?, ?bool?, ?int32?, ?double?, ?date?, ?guid?, ?int64?, ?binary?
 * A type must be specified for guid, int64, and binaries or the filter produced will be incorrect.
 *
 * @param {string}       condition   The condition string.
 * @param {string|array} value       Value(s) to insert in question mark (?) parameters.
 * @return {TableQuery}  A table query object with the where clause.
 * @example
 * var tableQuery = new TableQuery().where(TableQuery.guidFilter('GuidField', QueryComparisons.EQUAL, guidVal));
 * OR
 * var tableQuery = new TableQuery().where('Name == ? or Name <= ?', name1, name2);
 * OR
 * var tableQuery = new TableQuery().where('Name == ?string? && Value == ?int64?, name1, int64Val);
 *
 * // tasktable should already exist and have entities
 * tableService.queryEntities('tasktable', tableQuery, null \/*currentToken*\/, function(error, result, response) {
 *   if(!error) { 
 *     var entities = result.entities;
 *     // do stuff with the returned entities if there are any
 *   }
 * });
 */
TableQuery.prototype.where = function (condition) {  
  this._where.push(TableQuery._encodeConditionString(condition, arguments));
  return this;
};

/**
 * Generates a property filter condition string for an 'int' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|int}   value          An 'int' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.int32Filter('IntField', QueryComparisons.EQUAL, 5);
 */
TableQuery.int32Filter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.INT32);
};

/**
 * Generates a property filter condition string for a 'int64' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|int64} value          An 'int64' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.int64Filter('Int64Field', QueryComparisons.EQUAL, 123);
 */
TableQuery.int64Filter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.INT64);
};

/**
 * Generates a property filter condition string for a 'double' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|double}value          A 'double' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.doubleFilter('DoubleField', QueryComparisons.EQUAL, 123.45);
 */
TableQuery.doubleFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.DOUBLE);
};

/**
 * Generates a property filter condition string for a 'boolean' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|boolean}       value          A 'boolean' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.booleanFilter('BooleanField', QueryComparisons.EQUAL, false);
 */
TableQuery.booleanFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.BOOLEAN);
};

/**
 * Generates a property filter condition string for a 'datetime' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|date}     value              A 'datetime' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.dateFilter('DateTimeField', QueryComparisons.EQUAL, new Date(Date.UTC(2001, 1, 3, 4, 5, 6)));
 */
TableQuery.dateFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.DATETIME);
};

/**
 * Generates a property filter condition string for a 'guid' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|guid}  value          A 'guid' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.guidFilter('GuidField', QueryComparisons.EQUAL, guid.v1());
 */
TableQuery.guidFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.GUID);
};

/**
 * Generates a property filter condition string for a 'binary' value.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string|buffer}value          A 'buffer' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.binaryFilter('BinaryField', QueryComparisons.EQUAL, new Buffer('hello'));
 */
TableQuery.binaryFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.BINARY);
};

/**
 * Generates a property filter condition string.
 *
 * @param {string}       propertyName   A string containing the name of the property to compare.
 * @param {string}       operation      A string containing the comparison operator to use. 
 *                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
 * @param {string}       value          A 'string' containing the value to compare with the property.
 * @return {string} A string containing the formatted filter condition.
 * @example
 * var query = TableQuery.stringFilter('StringField', QueryComparisons.EQUAL, 'name');
 */
TableQuery.stringFilter = function (propertyName, operation, value) {
  return TableQuery._concatFilterString(propertyName, operation, value, EdmType.STRING);
};

/**
 * Creates a filter condition using the specified logical operator on two filter conditions.
 *
 * @param {string}       filterA          A string containing the first formatted filter condition.
 * @param {string}       operatorString   A string containing the operator to use (AND, OR).
 * @param {string}       filterB          A string containing the second formatted filter condition.
 * @return {string} A string containing the combined filter expression.
 * @example
 * var filter1 = TableQuery.stringFilter('Name', QueryComparisons.EQUAL, 'Person');
 * var filter2 = TableQuery.booleanFilter('Visible', QueryComparisons.EQUAL, true);
 * var combinedFilter = TableQuery.combineFilters(filter1, TablUtilities.TableOperators.AND, filter2);
 */
TableQuery.combineFilters = function (filterA, operatorString, filterB) {
  return filterA + ' ' + operatorString + ' ' + filterB;
};

/**
 * Specifies an AND where condition.
 *
 * @param {string}       condition   The condition string.
 * @param {array}        arguments   Any number of arguments to be replaced in the condition by the question mark (?).
 * @return {TableQuery} A table query object with the and clause.
 * @example
 * var tableQuery = new TableQuery()
 *                      .where('Name == ? or Name <= ?', 'Person1', 'Person2');
 *                      .and('Age >= ?', 18);
 */
TableQuery.prototype.and = function (condition) {
  if (this._where.length === 0) {
    throw new Error(util.format(SR.QUERY_OPERATOR_REQUIRES_WHERE, 'AND'));
  }

  this._where.push(' and ' + TableQuery._encodeConditionString(condition, arguments));
  return this;
};

/**
 * Specifies an OR where condition.
 *
 * @param {string}       condition   The condition.
 * @param {array}        arguments   Any number of arguments to be replaced in the condition by the question mark (?).
 * @return {TableQuery} A table query object with the or clause.
 * @example
 * var tableQuery = new TableQuery()
 *                      .where('Name == ? or Name <= ?', 'Person1', 'Person2');
 *                      .or('Age >= ?', 18);
 */
TableQuery.prototype.or = function (condition) {
  if (this._where.length === 0) {
    throw new Error(util.format(SR.QUERY_OPERATOR_REQUIRES_WHERE, 'OR'));
  }

  this._where.push(' or ' + TableQuery._encodeConditionString(condition, arguments));
  return this;
};

/**
 * Returns the query string object for the query.
 *
 * @return {object} JSON object representing the query string arguments for the query.
 */
TableQuery.prototype.toQueryObject = function () {
  var query = {};
  if (this._fields.length > 0) {
    query[QueryStringConstants.SELECT] = this._fields.join(',');
  }

  if (this._where.length > 0) {
    query[QueryStringConstants.FILTER] = this._where.join('');
  }

  if (this._top) {
    query[QueryStringConstants.TOP] = this._top;
  }

  return query;
};

// Functions

/**
* Concat the filter string parameters.
*
* @param {string}       propertyName   A string containing the name of the property to compare.
* @param {string}       operation      A string containing the comparison operator to use. 
*                                      See Constants.TableConstants.QueryComparisons for a list of allowed operations.
* @param {object}       value          The value to compare with the property.
* @param {string}       type           A string EdmType of the property to compare.
* @return {string} A string containing the formatted filter condition.
* @ignore
*/
TableQuery._concatFilterString = function (propertyName, operation, value, type) {
  if (azureutil.objectIsNull(propertyName)) {
    throw new Error(util.format(SR.ARGUMENT_NULL_OR_UNDEFINED, 'propertyName'));
  }

  if (azureutil.objectIsNull(operation)) {
    throw new Error(util.format(SR.ARGUMENT_NULL_OR_UNDEFINED, 'operation'));
  }

  if (azureutil.objectIsNull(value)) {
    throw new Error(util.format(SR.ARGUMENT_NULL_OR_UNDEFINED, 'value'));
  }

  var serializedValue = edmHandler.serializeQueryValue(value, type);
  return propertyName + ' ' + operation + ' ' + serializedValue;
};

/**
 * Encodes a condition string.
 *
 * @param {string}       condition   The condition.
 * @param {array}        arguments   Any number of arguments to be replaced in the condition by the question mark (?).
 * @return {TableQuery} A table query object with the or clause
 * @ignore
 */
TableQuery._encodeConditionString = function (condition, args) {
  var encodedCondition = TableQuery._replaceOperators(condition);
  if (args.length > 1) {
    var sections = encodedCondition.split(/(\?string\?|\?int32\?|\?int64\?|\?bool\?|\?double\?|\?date\?|\?binary\?|\?guid\?|\?)/);
    var count = 1;
    for (var i = 0; i < sections.length && count < args.length; i++) {
      if (sections[i].indexOf('?') === 0) {
        var type = TableQuery._getEdmType(sections[i]);
        sections[i] = edmHandler.serializeQueryValue(args[count], type);
        count++;
      }
    }
    encodedCondition = sections.join('');
  }

  return encodedCondition;
};

/**
 * Converts the query string type to an Edm type.
 *
 * @param {string} type The type included in the query string.
 * @return {string} The EdmType.
 * @ignore
 */
TableQuery._getEdmType = function (type) {
  switch (type) {
    case '?binary?':
      return EdmType.BINARY;
    case '?int64?':
      return EdmType.INT64;
    case '?date?':
      return EdmType.DATETIME;
    case '?guid?':
      return EdmType.GUID;
    case '?int32?':
      return EdmType.INT32;
    case '?double?':
      return EdmType.DOUBLE;
    case '?bool?':
      return EdmType.BOOLEAN;
    case '?string?':
      return EdmType.STRING;
    default:
      return undefined;
  }
};

/**
 * Replace operators.
 * @ignore
 * @param {string} whereClause The text where to replace the operators.
 * @return {string} The string with the replaced operators.
 * @ignore
 */
TableQuery._replaceOperators = function (whereClause) {
  var encodedWhereClause = whereClause.replace(/ == /g, ' ' + QueryComparisons.EQUAL + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ != /g, ' ' + QueryComparisons.NOT_EQUAL + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ >= /g, ' ' + QueryComparisons.GREATER_THAN_OR_EQUAL + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ > /g, ' ' + QueryComparisons.GREATER_THAN + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ <= /g, ' ' + QueryComparisons.LESS_THAN_OR_EQUAL + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ < /g, ' ' + QueryComparisons.LESS_THAN + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ \&\& /g, ' ' + TableOperators.AND + ' ');
  encodedWhereClause = encodedWhereClause.replace(/ \|\| /g, ' ' + TableOperators.OR + ' ');
  encodedWhereClause = encodedWhereClause.replace(/!/g, TableOperators.NOT);

  return encodedWhereClause;
};

module.exports = TableQuery;
},{"./../../common/common":5,"./internal/edmhandler":58,"./tableutilities":68,"underscore":577,"util":"util"}],58:[function(require,module,exports){
(function (Buffer){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

var _ = require('underscore');
var util = require('util');
var guid = require('node-uuid');

var azureCommon = require('./../../../common/common');
var azureutil = azureCommon.util;
var SR = azureCommon.SR;

var TableUtilities = require('../tableutilities');
var EdmType = TableUtilities.EdmType;

/**
* Get the Edm type of an object.
*
* @param {object} value A typed instance.
* @return {string} The Edm type.
*/
exports.propertyType = function (value, guessNumberType) {
  if (_.isNumber(value)) {
    if (guessNumberType) {
      if (azureutil.objectIsInt(value)) {
        return 'Edm.Int32';
      } else {
        return 'Edm.Double';
      }
    } else {
      return null;
    }
  } else if (_.isBoolean(value)) {
    return 'Edm.Boolean';
  } else if (_.isDate(value)) {
    return 'Edm.DateTime';
  } else {
    return 'Edm.String';
  }
};

/**
* Convert a JSON value from over the wire into the correct EDM type.
* 
* Note that Int64, is remaining a string.  Converting it to a Number would lose precision.
* Int32, Boolean, and Double should already be the correct non-string types
*
* @param {string} type  The type of the value as it appears in the type attribute.
* @param value The value in JSON format.
* @return {object} The unserialized value.
*/
exports.deserializeValueFromJson = function (type, value) {
  if (type) {
    switch (type) {
      case EdmType.BINARY:
        return new Buffer(value, 'base64');
      case EdmType.DATETIME:
        return new Date(value);
      case EdmType.GUID:
        return value;
      case EdmType.DOUBLE:
        // Account for Infinity and NaN:
        if (typeof value !== 'number') {
          return parseFloat(value);
        }
        return value;
      case EdmType.INT32:
      case EdmType.INT64:
      case EdmType.STRING:
      case EdmType.BOOLEAN:
        return value;
      default:
        throw new Error(util.format(SR.TYPE_NOT_SUPPORTED, type));
    }
  } else {
    return value;
  }
};

/**
* Convert a raw EdmType value into the JSON value expected to be sent over the wire.
*
* TODO: validate correct input types?
* Expects Edm.Int64 and Edm.String to be string, Edm.Double and Edm.Int32 to be Number,
* Edm.Guid to be an array or buffer compatible with Node.uuid, Edm.Binary to be a Node Buffer, Edm.DateTime to be a Date,
* and Edm.Boolean to be a boolean.
*
* @param {string} type  The type of the value as it will appear in the type attribute.
* @param {string} value The value
* @return {object} The serialized value.
*/
exports.serializeValue = function (type, value) {
  switch (type) {
    case EdmType.BINARY:
      if (Buffer.isBuffer(value)) {
        return value.toString('base64');
      }
      return value;
    case EdmType.DATETIME:
      if (_.isDate(value)) {
        return value.toISOString();
      }
      return value;
    case EdmType.GUID:
      if (Buffer.isBuffer(value) || _.isArray(value)) {
        return guid.unparse(value);
      }
      return value;
    case EdmType.INT64:
    case EdmType.DOUBLE:
      return value.toString();
    case EdmType.INT32:
      if (value === Number.POSITIVE_INFINITY) {
        return 'Infinity';
      }
      if (value === Number.NEGATIVE_INFINITY) {
        return '-Infinity';
      }
      if (azureutil.objectIsNaN(value)) {
        return 'NaN';
      }
      return value;
    case EdmType.STRING:
    case EdmType.BOOLEAN:
      return value;
    default:
      throw new Error(SR.TYPE_NOT_SUPPORTED + type);
  }
};

/*
* Determines if a type annotation is required for the input type when sending JSON data to the service. 
*/
exports.isTypeRequired = function(type, value) {
  switch (type) {
  case EdmType.BINARY:
  case EdmType.INT64:
  case EdmType.DATETIME:
  case EdmType.GUID:
  case EdmType.DOUBLE:
    return true;
  case EdmType.INT32:
    if (typeof value !== 'number' || value === Number.POSITIVE_INFINITY || value === Number.NEGATIVE_INFINITY || (azureutil.objectIsNaN(value))) {
      return true;
    }
    return false;
  case EdmType.STRING:
  case EdmType.BOOLEAN:
    return false;
  default:
    throw new Error(util.format(SR.TYPE_NOT_SUPPORTED, type));
  }
};

/**
* Serializes value into proper value to be used in odata query value.
*
* @param {object} value The value to be serialized.
* @return {string} The serialized value.
*/
exports.serializeQueryValue = function (value, type) {
  var edmType = type || exports.propertyType(value, true);
  switch (edmType) {
    case EdmType.INT32:
      return value.toString();
    case EdmType.BOOLEAN:
      return value ? 'true' : 'false';
    case EdmType.DOUBLE:
      return value.toString();
    case EdmType.INT64:
      return value.toString() + 'L';
    case EdmType.DATETIME:
      if(_.isDate(value)) {
        var dateTimeString = value.toISOString();
        return 'datetime\'' + dateTimeString + '\'';
      }
      throw new Error(util.format(SR.INVALID_EDM_TYPE, value, type));
    case EdmType.GUID:
      return 'guid\'' + value.toString() + '\'';
    case EdmType.BINARY:
      return 'X\'' + value.toString('hex') + '\'';
    default:
      return '\'' + value.toString().replace(/'/g, '\'\'') + '\'';
  }   
};
}).call(this,require("buffer").Buffer)
},{"../tableutilities":68,"./../../../common/common":5,"buffer":"buffer","node-uuid":437,"underscore":577,"util":"util"}],65:[function(require,module,exports){
// 
// Copyright (c) Microsoft and contributors.  All rights reserved.
// 
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//   http://www.apache.org/licenses/LICENSE-2.0
// 
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// 
// See the License for the specific language governing permissions and
// limitations under the License.
// 

// Module dependencies.
var extend = require('extend');

var azureCommon = require('./../../common/common');
var SR = azureCommon.SR;
var validate = azureCommon.validate;
var Constants = azureCommon.Constants;
var TableConstants = Constants.TableConstants;

/**
* Creates a new TableBatch.
*
* @constructor
*/
function TableBatch() {
  this.operations = [];
  this.pk = null;
  this.retrieve = false;
}

/**
* Removes all of the operations from the batch.
*/
TableBatch.prototype.clear = function () {
  this.operations = [];
};

/**
* Returns a boolean value indicating weather there are operations in the batch.
*
* @return {Boolean} True if there are operations queued up; false otherwise.
*/
TableBatch.prototype.hasOperations = function () {
  return this.operations.length > 0;
};

/**
* Returns the number of operations in the batch.
*
* @return {number} The number of operations in the batch.
*/
TableBatch.prototype.size = function () {
  return this.operations.length;
};

/**
* Adds a retrieve operation to the batch. Note that this must be the only operation in the batch.
*
* @param {string}             partitionKey                                    The partition key.
* @param {string}             rowKey                                          The row key.
* @param {object}             [options]                                       The request options.
* @param {string}             [options.payloadFormat]                         The payload format to use for the request.
* @param {TableService~propertyResolver}  [options.propertyResolver]  The property resolver. Given the partition key, row key, property name, property value,
*                                                                             and the property Edm type if given by the service, returns the Edm type of the property.
* @param {Function(entity)} [options.entityResolver]                          The entity resolver. Given the single entity returned by the query, returns a modified object.
*/
TableBatch.prototype.retrieveEntity = function (partitionKey, rowKey, options) {
  var entity = { PartitionKey: {_: partitionKey, $: 'Edm.String'},
    RowKey: {_: rowKey, $: 'Edm.String'},
  };
  this.addOperation(TableConstants.Operations.RETRIEVE, entity, options);
};

/**
* Adds an insert operation to the batch.
*
* @param {object}             entity                                          The entity.
* @param {object}             [options]                                       The request options.
* @param {string}             [options.echoContent]                           Whether or not to return the entity upon a successful insert. Inserts only, default to false.
* @param {string}             [options.payloadFormat]                         The payload format to use for the request.
* @param {TableService~propertyResolver}  [options.propertyResolver]  The property resolver. Only applied if echoContent is true. Given the partition key, row key, property name, 
*                                                                             property value, and the property Edm type if given by the service, returns the Edm type of the property.
* @param {Function(entity)} [options.entityResolver]                          The entity resolver. Only applied if echoContent is true. Given the single entity returned by the insert, returns 
*                                                                             a modified object.
*/
TableBatch.prototype.insertEntity = function (entity, options) {
  this.addOperation(TableConstants.Operations.INSERT, entity, options);
};

/**
* Adds a delete operation to the batch.
*
* @param {object}             entity              The entity.
*/
TableBatch.prototype.deleteEntity = function (entity) {
  this.addOperation(TableConstants.Operations.DELETE, entity);
};

/**
* Adds a merge operation to the batch.
*
* @param {object}             entity              The entity.
*/
TableBatch.prototype.mergeEntity = function (entity) {
  this.addOperation(TableConstants.Operations.MERGE, entity);
};

/**
* Adds an replace operation to the batch.
*
* @param {object}             entity              The entity.
*/
TableBatch.prototype.replaceEntity = function (entity) {
  this.addOperation(TableConstants.Operations.REPLACE, entity);
};

/**
* Adds an insert or replace operation to the batch.
*
* @param {object}             entity              The entity.
*/
TableBatch.prototype.insertOrReplaceEntity = function (entity) {
  this.addOperation(TableConstants.Operations.INSERT_OR_REPLACE, entity);
};

/**
* Adds an insert or merge operation to the batch.
*
* @param {object}             entity              The entity.
*/
TableBatch.prototype.insertOrMergeEntity = function (entity) {
  this.addOperation(TableConstants.Operations.INSERT_OR_MERGE, entity);
};

/**
* Adds an operation to the batch after performing checks.
*
* @param {string}             operationType       The type of operation to perform. See Constants.TableConstants.Operations
* @param {object}             entity              The entity.
* @param {object}             [options]                                       The request options.
*/
TableBatch.prototype.addOperation = function (operationType, entity, options) {
  validate.validateArgs('addOperation', function (v) {
    v.object(entity, 'entity');
    v.object(entity.PartitionKey, 'entity.PartitionKey');
    v.object(entity.RowKey, 'entity.RowKey');
    v.stringAllowEmpty(entity.PartitionKey._, 'entity.PartitionKey._');
    v.stringAllowEmpty(entity.RowKey._, 'entity.RowKey._');
  });

  if(this.operations.length >= 100) {
    throw new Error(SR.BATCH_TOO_LARGE);
  }

  if (operationType === TableConstants.Operations.RETRIEVE) {
    if(this.hasOperations()) {
      throw new Error(SR.BATCH_ONE_RETRIEVE);
    } else {
      this.retrieve = true;
    }
  } else if (this.retrieve) {
    throw new Error(SR.BATCH_ONE_RETRIEVE);
  }

  if (!this.hasOperations()) {
    this.pk = entity.PartitionKey._;
  } else if (entity.PartitionKey._ !== this.pk) {
    throw new Error(SR.BATCH_ONE_PARTITION_KEY);
  }

  var copiedOptions = extend(true, {}, options);
  this.operations.push({type: operationType, entity: entity, options: copiedOptions});
};

/**
* Gets an operation from the batch. Returns null if the index does not exist.
*
* @param {number}             index           The index in the operations array at which to remove an element.
* @return {object}                            The removed operation.
*/
TableBatch.prototype.getOperation = function (index) {
  return this.operations[index];
};

/**
* Removes an operation from the batch. Returns null if the index does not exist.
*
* @param {number}             index           The index in the operations array at which to remove an element.
* @return {object}                            The removed operation.
*/
TableBatch.prototype.removeOperation = function (index) {
  var operation = this.operations.splice(index, 1)[0];

  // if the array is empty, unlock the partition key
  if (!this.hasOperations()) {
    this.pk = null;
    this.retrieve = false;
  }

  return operation;
};

module.exports = TableBatch;

},{"./../../common/common":5,"extend":431}]},{},[4]);
