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
        return cb (err, data);
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

/**
 * TEMPORARY SOLUTION TO https://github.com/gomfunkel/node-exif/pull/30
 */
ExifImage.prototype.processImage = function (data, callback) {

  var self = this;
  var offset = 0;

  if (data[offset++] == 0xFF && data[offset++] == 0xD8) {
    self.imageType = 'JPEG';
  } else {
    callback(new Error('The given image is not a JPEG and thus unsupported right now.'));
    return;
  }

  try {

    while (offset < data.length) {

      if (data[offset++] != 0xFF) {
        callback(false, self.exifData);
        return;
      }

      if (data[offset++] == 0xE1) {
        var exifData = self.extractExifData(data, offset + 2, data.getShort(offset, true) - 2);
        callback(false, exifData);
        return;
      } else {
        offset += data.getShort(offset, true);
      }

    }

  } catch (error) {
    return callback(error); // FIXED, waiting for merge on official repository
  }

  callback(new Error('No Exif segment found in the given image.'));

};
/**
 * END TEMPORARY SOLUTION TO https://github.com/gomfunkel/node-exif/pull/30
 */

function getExifData(image, cb) {
  try {
    new ExifImage({ image : image }, function (error, exifData) {
      if (error)
        cb('Error: ' + error.message, {InteropIndex: null, isAdobe: false, ColorSpace: null});
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
