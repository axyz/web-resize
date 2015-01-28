var gm = require('gm');
var ExifImage = require('exif').ExifImage;
var async = require('async');

exports.getColorProfile = function getExifColorProfile(image, cb) {
    async.parallel({
        hasEmbeddedICCProfile: function (cb) {
            hasEmbeddedICCProfile(image, function (err, data) {
                cb (err, data);
            });
        },
        getExifData: function (cb) {
            getExifData(image, function (err, data) {
                cb(err, data);
            });
        }
    }, function (err, data) {
        if (data.hasEmbeddedICCProfile && !data.getExifData.isAdobe) {
            cb(null, 'embedded');
        } else if(data.getExifData.isAdobe && data.getExifData.ColorSpace === 65535) {
            cb(null, 'AdobeRGB1998');
        } else if (data.getExifData.InteropIndex === 'R98') {
            cb(null, 'sRGB');
        } else if (data.getExifData.InteropIndex === 'R03') {
            cb(null, 'AdobeRGB1998');
        } else {
            cb(null, 'unknown');
        }
    });
};


function hasEmbeddedICCProfile(image, cb) {
    gm(image)
        .setFormat('icc')
        .toBuffer(function(err, buffer){
            cb(null, buffer !== null);
        });
};

function getExifData(image, cb) {
    try {
        new ExifImage({ image : image }, function (error, exifData) {
            if (error)
                cb('Error: ' + error.message, null);
            else {
                var isAdobe = exifData.image.Software.match(/adobe/gi) !== null;
                cb(null, {InteropIndex: exifData.interoperability.InteropIndex,
                          isAdobe: isAdobe,
                          ColorSpace: exifData.exif.ColorSpace});
            }
        });
    } catch (error) {
        cb('Error: ' + error.message, null);
    }
};
