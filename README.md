# connect-multiparty

This is a drop-in replacement for the
[multipart connect middleware](https://github.com/senchalabs/connect/blob/master/lib/middleware/multipart.js).

If
[the pull request to merge into connect](https://github.com/senchalabs/connect/pull/786)
is accepted, this project can go away.

The connect test suite for multipart and bodyParser has been imported, and all
tests pass.

## Usage

```js
var multipart = require('connect-multiparty').multipart;
app.use(bodyParser());
```
or

```js
var multipart = require('connect-multiparty').multipart;
app.use(multipart());
```

