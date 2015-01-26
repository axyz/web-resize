var gm = require('gm');
var ExifImage = require('exif').ExifImage;

exports.hasEmbeddedICCProfile = function hasEmbeddedICCProfile(image, cb) {
    gm(image)
        .setFormat('icc')
        .toBuffer(function(err, buffer){
            cb(null, buffer !== null);
        });
};

exports.getInteropIndex = function getInteropIndex(image, cb) {
    try {
        new ExifImage({ image : image }, function (error, exifData) {
            if (error)
                cb('Error: ' + error.message, null);
            else {
                cb(null, exifData.interoperability.InteropIndex);
            }
        });
    } catch (error) {
        cb('Error: ' + error.message, null);
    }
};
