# connect-multiparty

[connect](https://github.com/senchalabs/connect/) middleware for
[multiparty](https://github.com/andrewrk/node-multiparty/).

I actually recommend against using this module. It's cleaner to use the
multiparty API directly.

This middleware will create temp files on your server and never clean them
up. Thus you should not add this middleware to all routes; only to the ones
in which you want to accept uploads. And in these endpoints, be sure to
delete all temp files, even the ones that you don't use.

## Usage

```js
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
app.post('/upload', multipartMiddleware, function(req, resp) {
  console.log(req.body, req.files);
  // don't forget to delete all req.files when done
});
```

If you pass options to `multipart()`, they are passed directly into
multiparty.
