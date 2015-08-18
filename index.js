/*!
 * Connect - multipart
 * Copyright(c) 2010 Sencha Inc.
 * Copyright(c) 2011 TJ Holowaychuk
 * Copyright(c) 2013 Andrew Kelley
 * MIT Licensed
 */

/**
 * Module dependencies.
 */

var fs = require('fs');
var util = require('util');
var async = require('async');
var multiparty = require('multiparty');
var onFinished = require('on-finished');
var qs = require('qs');
var typeis = require('type-is');

/**
 * Multipart:
 *
 * Parse multipart/form-data request bodies,
 * providing the parsed object as `req.body`
 * and `req.files`.
 *
 * Configuration:
 *
 *  The options passed are merged with [multiparty](https://github.com/andrewrk/node-multiparty)'s
 *  `Form` object, allowing you to configure the upload directory,
 *  size limits, etc. For example if you wish to change the upload dir do the following.
 *
 *  Additional options:
 *    deleteOnFinish - an array of files to delete, true for all files or null for not deleting any file
 *
 *     app.use(connect.multipart({ uploadDir: path }));
 *
 * @param {Object} options
 * @return {Function}
 * @api public
 */

exports = module.exports = function(options){
  options = options || {};
  var deleteOnFinish = options.deleteOnFinish;

  return function multipart(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};
    req.files = req.files || {};

    // ignore GET
    if ('GET' === req.method || 'HEAD' === req.method) return next();

    // check Content-Type
    if (!typeis(req, 'multipart/form-data')) return next();

    // flag as parsed
    req._body = true;

    // parse
    var form = new multiparty.Form(options);
    var data = {};
    var files = {};
    var done = false;

    function ondata(name, val, data){
      if (Array.isArray(data[name])) {
        data[name].push(val);
      } else if (data[name]) {
        data[name] = [data[name], val];
      } else {
        data[name] = val;
      }
    }

    function deleteFilesOnFinish(deleteFiles) {
      res.on('finish', function() {
        async.each(deleteFiles, function(fileName, callback) {
          var file = req.files[fileName];
          file ? fs.unlink(file.path, callback) : callback();
        }, function(err) {
          // errors are ignored
        });
      });
    }

    form.on('field', function(name, val){
      ondata(name, val, data);
    });

    form.on('file', function(name, val){
      val.name = val.originalFilename;
      val.type = val.headers['content-type'] || null;
      ondata(name, val, files);
    });

    form.on('error', function(err){
      if (done) return;

      done = true;
      err.status = 400;

      if (!req.readable) return next(err);

      req.resume();
      onFinished(req, function(){
        next(err);
      });
    });

    form.on('close', function() {
      if (done) return;

      done = true;

      try {
        req.body = qs.parse(data);
        req.files = qs.parse(files);
        var deleteFiles = util.isArray(deleteOnFinish) ? deleteOnFinish : deleteOnFinish == true ? Object.keys(req.files) : [];
        if (deleteFiles.length > 0) deleteFilesOnFinish(deleteFiles);
        next();
      } catch (err) {
        err.status = 400;
        next(err);
      }
    });

    form.parse(req);
  }
};
