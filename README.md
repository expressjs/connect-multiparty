# connect-multiparty

[connect](https://github.com/senchalabs/connect/) middleware for
[multiparty](https://github.com/andrewrk/node-multiparty/).

~I actually recommend against using this module. It's cleaner to use the
multiparty API directly.~

You should not add this middleware to all routes; only to the ones
in which you want to accept uploads. 

This middleware will create temp files on your server.
If you set autoClean to true temp files are  automatically removed at the
end request (on res 'finish' event).
If you *not* set autoClean, be sure to delete all temp files, even the ones
that you don't use (multiparty create file even for empty inputs file).

node.js could crash before end of request. This is why you *SHOULD* implement
automatic temp files cleaning with something like [reap](https://github.com/visionmedia/reap) for example.

## Usage

```js
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
app.post('/upload', multipartMiddleware, function(req, resp) {
  console.log(req.body, req.files);
  // don't forget to delete all req.files when done
});
```
## Options

```js
multipart(options, autoClean)
```

* ```options``` object is passed directly into multiparty.

* ```autoClean``` set to true to remove all temp files on request finishing.
