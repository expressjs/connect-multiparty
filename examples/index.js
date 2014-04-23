/**
 * Module dependencies.
 */

var express = require('express');
var bodyParser = require('body-parser');
var multipart = require('./../index');
var multipartMiddleware = multipart({}, true);
var format = require('util').format;

var app = module.exports = express();

app.use(bodyParser());

app.get('/', function (req, res) {
  res.send('<form method="post" enctype="multipart/form-data">'
    + '<h1>Multipart form</h1>'
    + '<p>Title: <input type="text" name="title" /></p>'
    + '<p>Image: <input type="file" name="image" /></p>'
    + '<p><input type="submit" value="Upload" /></p>'
    + '</form>'
    + '<form method="post">'
    + '<h1>No multipart form</h1>'
    + '<p>Title: <input type="text" name="title" /></p>'
    + '<p><input type="submit" value="Post" /></p>'
    + '</form>');
});

app.post('/', multipartMiddleware, function (req, res, next) {
  // the uploaded file can be found as `req.files.image` and the
  // title field as `req.body.title`
  if (req.files && req.files.image) {
    res.send(format('\nuploaded file <strong>%s</strong> (%d Kb) from field <strong>%s</strong> to <strong>%s</strong> as <strong>%s</strong>'
      , req.files.image.originalFilename
      , req.files.image.size / 1024 | 0
      , req.files.image.fieldName
      , req.files.image.path
      , req.body.title));

    // Do anything you want with your file...

  } else {
    res.send(format('\nform posted with value <strong>%s</strong>'
      , req.body.title));
  }
});

if (!module.parent) {
  app.listen(3000);
  console.log('Connect started on port 3000');
}