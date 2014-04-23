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

var multiparty = require('multiparty')
  , qs = require('qs')
  , fs = require('fs');

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
 *  size limits, etc. For examples if you wish to change the upload dir do the following.
 *
 *     app.use(connect.multipart({ uploadDir: path }));
 *
 * Pass an additionnal boolean to automatically remove temp files.
 *
 *     app.use(connect.multipart({ uploadDir: path }, true));
 *     app.use(connect.multipart({}, true));
 *
 * @param {Object} options
 * @param boolean autoClean
 * @return {Function}
 * @api public
 */

exports = module.exports = function(options, autoClean){
  options = options || {};
  autoClean = autoClean || false;

  return function multipart(req, res, next) {
    if (req._body) return next();
    req.body = req.body || {};
    req.files = req.files || {};

    if (!hasBody(req)) return next();

    // ignore GET
    if ('GET' === req.method || 'HEAD' === req.method) return next();

    // check Content-Type
    if ('multipart/form-data' !== mime(req)) return next();

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

    form.on('field', function(name, val){
      ondata(name, val, data);
    });

    form.on('file', function(name, val){
      val.name = val.originalFilename;
      val.type = val.headers['content-type'] || null;
      ondata(name, val, files);
      if (autoClean) {
        var autoCleaner = function () {
          fs.unlink(val.path, function (e) {
            if (e)
              console.log('connect-multiparty autoclean error: ' + e);
          });
        }
        res.on('finish', autoCleaner);
        res.on('close', autoCleaner);
      }
    });

    form.on('error', function(err){
      err.status = 400;
      next(err);
      done = true;
    });

    form.on('close', function() {
      if (done) return;
      try {
        req.body = qs.parse(data);
        req.files = qs.parse(files);
        next();
      } catch (err) {
        form.emit('error', err);
      }
    });

    form.parse(req);
  }
};

// utility functions copied from connect

function hasBody(req) {
  var encoding = 'transfer-encoding' in req.headers,
      length = 'content-length' in req.headers &&
        req.headers['content-length'] !== '0';
  return encoding || length;
}

function mime(req) {
  var str = req.headers['content-type'] || '';
  return str.split(';')[0];
}
