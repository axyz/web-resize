var gm = require('gm');
var async = require('async');
var fs = require('fs');
var _ = require('lodash');

var utils = require('./utils');
var colors = require('./colors');
var sizeOf = require('image-size');

module.exports = function webResize(input, geometry, output, opts) {
  opts = _.extend({
    ratio: 0.66,
    maxSteps: 4,
    format: 'jpg',
    quality: 92,
    stepRadius: 2,
    stepSigma: 0.5,
    stepAmount: 0.5,
    stepThreshold: 0.008,
    finalRadius: 2,
    finalSigma: 0.5,
    finalAmount: 0.5,
    finalThreshold: 0.006,
    icc: {
      sRGB: __dirname + '/assets/icc/sRGB_v4_ICC_preference.icc',
      //sRGB: __dirname + '/assets/icc/sRGB.icc',
      AdobeRGB1998: __dirname + '/assets/icc/AdobeRGB1998.icc'
    }
  }, opts);

  async.parallel({
    getSize: function (cb) {
      sizeOf(input, function (err, data) {
        cb(null, data);
      });
    },
    getColorProfile: function(cb) {
      colors.getColorProfile(input, function (err, data) {
        cb(null, data);
      });
    },
    parseGeometry: function (cb) {
      utils.parseGeometry(geometry, function (err, data) {
        cb(null, data);
      });
    }
  }, function (err, data) {
    if (err) console.log(err);
    var inputWidth = data.getSize.width;
    var inputHeight = data.getSize.height;
    var outputWidth = data.parseGeometry.width;
    var outputHeight = data.parseGeometry.height;
    var colorProfile = data.getColorProfile;
    var nSteps = utils.calculateSteps(inputWidth, inputHeight, outputWidth, outputHeight, opts.ratio, opts.maxSteps);

    var writeStream = fs.createWriteStream(output);

    console.log("iw: " + inputWidth +
                " ih: " + inputHeight +
                " ow: " + outputWidth +
                " oh: " + outputHeight +
                " in " + nSteps + " steps" +
                " from " + colorProfile + " color profile" );

    var step = (colorProfile === 'unknown' || colorProfile === 'sRGB' || colorProfile === 'embedded')
          ? gm(input).stream()
            : gm(input).in('-profile').in(opts.icc[colorProfile]).stream();


    for (var i = 1; i <= nSteps; i++) {
      var scale = Math.pow(opts.ratio, i);
      console.log("step " + i + ": " + inputWidth * scale + "x" + inputHeight * scale);
      step = gm(step)
        .resize(inputWidth * scale, inputHeight * scale)
        .unsharp(opts.stepRadius, opts.stepSigma, opts.stepAmount, opts.stepThreshold)
        .setFormat("miff")
        .stream();
    }

    gm(step)
      .resize(outputWidth, outputHeight)
      .unsharp(opts.finalRadius, opts.finalSigma, opts.finalAmount, opts.finalThreshold)
      .setFormat(opts.format)
      .quality(opts.quality)
    //.autoOrient() // TO-FIX: with autoOrient color profiling won't work!
      .profile(opts.icc['sRGB'])
      .stream()
      .pipe(writeStream);
  });
};
