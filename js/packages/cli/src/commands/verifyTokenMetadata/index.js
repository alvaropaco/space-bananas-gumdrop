"use strict";
exports.__esModule = true;
exports.verifyTokenMetadata = exports.verifyMetadataManifests = exports.verifyConsistentShares = exports.verifyImageURL = exports.verifyCreatorCollation = exports.verifyAggregateShare = exports.verifyAssets = void 0;
var path_1 = require("path");
var loglevel_1 = require("loglevel");
var jsonschema_1 = require("jsonschema");
var constants_1 = require("../../helpers/constants");
var token_metadata_schema_json_1 = require("./token-metadata.schema.json");
var verifyAssets = function (_a) {
    var files = _a.files, uploadElementsCount = _a.uploadElementsCount;
    var pngFileCount = files.filter(function (it) {
        return it.endsWith(constants_1.EXTENSION_PNG);
    }).length;
    var jsonFileCount = files.filter(function (it) {
        return it.endsWith(constants_1.EXTENSION_JSON);
    }).length;
    var parsedNumber = parseInt(uploadElementsCount, 10);
    var elemCount = parsedNumber !== null && parsedNumber !== void 0 ? parsedNumber : pngFileCount;
    if (pngFileCount !== jsonFileCount) {
        throw new Error("number of png files (" + pngFileCount + ") is different than the number of json files (" + jsonFileCount + ")");
    }
    if (elemCount < pngFileCount) {
        throw new Error("max number (" + elemCount + ") cannot be smaller than the number of elements in the source folder (" + pngFileCount + ")");
    }
    loglevel_1["default"].info("Verifying token metadata for " + pngFileCount + " (png+json) pairs");
};
exports.verifyAssets = verifyAssets;
var verifyAggregateShare = function (creators, manifestFile) {
    var aggregateShare = creators
        .map(function (creator) { return creator.share; })
        .reduce(function (memo, share) {
        return memo + share;
    }, 0);
    // Check that creator share adds up to 100
    if (aggregateShare !== 100) {
        throw new Error("Creator share for " + manifestFile + " does not add up to 100, got: " + aggregateShare + ".");
    }
};
exports.verifyAggregateShare = verifyAggregateShare;
var verifyCreatorCollation = function (creators, collatedCreators, manifestFile) {
    for (var _i = 0, creators_1 = creators; _i < creators_1.length; _i++) {
        var _a = creators_1[_i], address = _a.address, share = _a.share;
        if (collatedCreators.has(address)) {
            var creator = collatedCreators.get(address);
            creator.shares.add(share);
            if (creator.shares.size > 1) {
                loglevel_1["default"].warn("The creator share for " + address + " in " + manifestFile + " is different than the share declared for a previous token.  This means at least one token is inconsistently configured, but we will continue.  ");
            }
            creator.tokenCount += 1;
        }
        else {
            collatedCreators.set(address, {
                tokenCount: 1,
                shares: new Set([share])
            });
        }
    }
};
exports.verifyCreatorCollation = verifyCreatorCollation;
var verifyImageURL = function (image, files, manifestFile) {
    var expectedImagePath = "image" + constants_1.EXTENSION_PNG;
    if (image !== expectedImagePath) {
        // We _could_ match against this in the JSON schema validation, but it is totally valid to have arbitrary URLs to images here.
        // The downside, though, is that those images will not get uploaded to Arweave since they're not on-disk.
        loglevel_1["default"].warn("We expected the `image` property in " + manifestFile + " to be " + expectedImagePath + ".\nThis will still work properly (assuming the URL is valid!), however, this image will not get uploaded to Arweave through the `metaplex upload` command.   \nIf you want us to take care of getting this into Arweave, make sure to set `image`: \"" + expectedImagePath + "\"\nThe `metaplex upload` command will automatically substitute this URL with the Arweave URL location.\n    ");
    }
    var pngFiles = files.filter(function (file) { return file.type === 'image/png'; });
    if (pngFiles.length === 0 || !pngFiles.some(function (file) { return file.uri === image; })) {
        throw new Error("At least one entry with the `image/png` type in the `properties.files` array is expected to match the `image` property.");
    }
};
exports.verifyImageURL = verifyImageURL;
var verifyConsistentShares = function (collatedCreators) {
    // We expect all creators to have been added to the same amount of tokens
    var tokenCountSet = new Set();
    for (var _i = 0, _a = collatedCreators.entries(); _i < _a.length; _i++) {
        var _b = _a[_i], address = _b[0], collation = _b[1];
        tokenCountSet.add(collation.tokenCount);
        if (tokenCountSet.size > 1) {
            loglevel_1["default"].warn("We found that " + address + " was added to more tokens than other creators.");
        }
    }
};
exports.verifyConsistentShares = verifyConsistentShares;
var verifyMetadataManifests = function (_a) {
    var files = _a.files;
    var manifestFiles = files.filter(function (file) { return path_1["default"].extname(file) === constants_1.EXTENSION_JSON; });
    // Used to keep track of the share allocations for individual creators
    // We will send a warning if we notice discrepancies across the entire collection.
    var collatedCreators = new Map();
    // Do manifest-specific stuff here
    for (var _i = 0, manifestFiles_1 = manifestFiles; _i < manifestFiles_1.length; _i++) {
        var manifestFile = manifestFiles_1[_i];
        // Check the overall schema shape. This is a non-exhaustive check, but guarantees the bare minimum needed for the rest of the commands to succeed.
        var tokenMetadata = require(manifestFile);
        (0, jsonschema_1.validate)(tokenMetadata, token_metadata_schema_json_1["default"], { throwError: true });
        var creators = tokenMetadata.properties.creators;
        (0, exports.verifyAggregateShare)(creators, manifestFile);
        (0, exports.verifyCreatorCollation)(creators, collatedCreators, manifestFile);
        // Check that the `image` and at least one of the files has a URI matching the index of this token.
        var image = tokenMetadata.image, files_1 = tokenMetadata.properties.files;
        (0, exports.verifyImageURL)(image, files_1, manifestFile);
    }
    (0, exports.verifyConsistentShares)(collatedCreators);
};
exports.verifyMetadataManifests = verifyMetadataManifests;
var verifyTokenMetadata = function (_a) {
    // Will we need to deal with the cache?
    var files = _a.files, _b = _a.uploadElementsCount, uploadElementsCount = _b === void 0 ? null : _b;
    (0, exports.verifyAssets)({ files: files, uploadElementsCount: uploadElementsCount });
    (0, exports.verifyMetadataManifests)({ files: files });
    return true;
};
exports.verifyTokenMetadata = verifyTokenMetadata;
