var gm = require('gm');
var async = require('async');
var fs = require('fs');
var _ = require('lodash');

var utils = require('./utils');

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
            AdobeRGB1998: __dirname + '/assets/icc/AdobeRGB1998.icc'
        }
    }, opts);

    async.parallel({
        getSize: function (cb) {
            utils.getSize(input, function (err, data) {
                cb(null, data);
            });
        },
        getExifColorProfile: function(cb) {
            utils.getExifColorProfile(input, function (err, data) {
                cb(null, data);
            });
        },
        parseGeometry: function (cb) {
            utils.parseGeometry(geometry, function (err, data) {
                cb(null, data);
            });
        }
    }, function (err, data) {
        var inputWidth = data.getSize.width;
        var inputHeight = data.getSize.height;
        var outputWidth = data.parseGeometry.width;
        var outputHeight = data.parseGeometry.height;
        var colorProfile = data.getExifColorProfile;
        var nSteps = utils.calculateSteps(inputWidth, inputHeight, outputWidth, outputHeight, opts.ratio, opts.maxSteps);

        var writeStream = fs.createWriteStream(output);

        console.log("iw: " + inputWidth +
                    " ih: " + inputHeight +
                    " ow: " + outputWidth +
                    " oh: " + outputHeight +
                    " in " + nSteps + " steps" +
                    " from " + colorProfile + " color profile" );

        var step = gm(input).stream();

        for (var i = 1; i <= nSteps; i++) {
            var scale = Math.pow(opts.ratio, i);
            console.log("step " + i + ": " + inputWidth * scale + "x" + inputHeight * scale);
            step = gm(step)
                .resize(inputWidth * scale, inputHeight * scale)
                .unsharp(opts.stepRadius, opts.stepSigma, opts.stepAmount, opts.stepThreshold)
                .setFormat("miff")
                .stream();
        }

        if (colorProfile === 'unknown' || colorProfile === 'sRGB' || colorProfile === 'embedded') {
            gm(step)
                .resize(outputWidth, outputHeight)
                .unsharp(opts.finalRadius, opts.finalSigma, opts.finalAmount, opts.finalThreshold)
                .setFormat(opts.format)
                .quality(opts.quality)
                .autoOrient()
                .profile(opts.icc['sRGB'])
                .stream()
                .pipe(writeStream);
        } else {
            gm(step)
                .profile(opts.icc[colorProfile])
                .resize(outputWidth, outputHeight)
                .unsharp(opts.finalRadius, opts.finalSigma, opts.finalAmount, opts.finalThreshold)
                .setFormat(opts.format)
                .quality(opts.quality)
                .autoOrient()
                .profile(opts.icc['sRGB'])
                .stream()
                .pipe(writeStream);
        }

    });
};
