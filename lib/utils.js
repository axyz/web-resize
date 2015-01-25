var gm = require('gm');
var ExifImage = require('exif').ExifImage;

exports.getSize = function getSize(file, cb) {
    gm(file).size(function (err, size) {
        if(err) {cb (err, null);}
        else {
            cb(null, {width: size.width, height: size.height});
        }
    });
};

exports.parseGeometry = function parseGeometry(geometry, cb) {
    var w = null;
    var h = null;

    var match = geometry.match(/(\d+)|(x\d+)/g);
    // if first match starts with x, w is null, else it is the matched number
    w = (match[0][0] === 'x')
        ? null
        : +match[0]; // casting from string to number using '+' operator
    h = (match[1])
        ? +match[1].substring(1)
        : (match[0][0] === 'x')
            ? +match[0].substring(1)
            : null;

    cb(null, {width: w, height: h});
};

exports.calculateSteps = function calculateSteps(inputWidth, inputHeight, outputWidth, outputHeight, ratio, maxSteps) {
    var steps = Math.floor(
        Math.max(inputWidth, inputHeight)
            / Math.max(outputWidth, outputHeight)
            * ratio);
    return (steps > maxSteps)
        ? maxSteps
        : steps;
};

exports.getExifColorProfile = function getExifColorProfile(image, cb) {
    try {
        new ExifImage({ image : image }, function (error, exifData) {
            if (error)
                cb('Error: ' + error.message, null);
            else
                switch (exifData.interoperability.InteropIndex) {
                case 'R98':
                    cb(null, 'sRGB');
                    break;
                case 'R03':
                    cb(null, 'AdobeRGB1998');
                    break;
                default:
                    cb(null, 'unknown');
                }
        });
    } catch (error) {
        cb('Error: ' + error.message, null);
    }
};
