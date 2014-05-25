
process.env.NODE_ENV = 'test';

var connect = require('connect');
var multipart = require('..');
var request = require('supertest');
var should = require('should');

var app = connect();

app.use(multipart());

app.use(function(req, res){
  res.end(JSON.stringify(req.body));
});

describe('multipart()', function(){
  it('should ignore GET', function(done){
    var test = request(app).get('/');
    test.set('Content-Type', 'multipart/form-data; boundary=foo');
    test.write('--foo\r\n');
    test.write('Content-Disposition: form-data; name="user"\r\n');
    test.write('\r\n');
    test.write('Tobi');
    test.write('\r\n--foo--');
    test.expect(200, '{}', done);
  })

  describe('with multipart/form-data', function(){
    it('should populate req.body', function(done){
      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="user"\r\n');
      test.write('\r\n');
      test.write('Tobi');
      test.write('\r\n--foo--');
      test.expect(200, '{"user":"Tobi"}', done);
    })
    
    it('should support files', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        should(req.body.user).eql({ name: 'Tobi' });
        req.files.text.path.should.include('.txt');
        req.files.text.constructor.name.should.equal('Object');
        res.end(req.files.text.originalFilename);
      });

      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="user[name]"\r\n');
      test.write('\r\n');
      test.write('Tobi');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('\r\n--foo--');
      test.expect(200, 'foo.txt', done);
    })
    
    it('should keep extensions', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        should(req.body.user).eql({ name: 'Tobi' });
        req.files.text.path.should.include('.txt');
        req.files.text.constructor.name.should.equal('Object');
        res.end(req.files.text.originalFilename);
      });

      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="user[name]"\r\n');
      test.write('\r\n');
      test.write('Tobi');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('\r\n--foo--');
      test.expect(200, 'foo.txt', done);
    })
    
    it('should work with multiple fields', function(done){
      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="user"\r\n');
      test.write('\r\n');
      test.write('Tobi');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="age"\r\n');
      test.write('\r\n');
      test.write('1');
      test.write('\r\n--foo--');
      test.expect(200, '{"user":"Tobi","age":"1"}', done);
    })
    
    it('should support nesting', function(done){
      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="user[name][first]"\r\n');
      test.write('\r\n');
      test.write('tobi');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="user[name][last]"\r\n');
      test.write('\r\n');
      test.write('holowaychuk');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="user[age]"\r\n');
      test.write('\r\n');
      test.write('1');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="species"\r\n');
      test.write('\r\n');
      test.write('ferret');
      test.write('\r\n--foo--');
      test.expect(200, function(err, res){
        if (err) return done(err);
        var obj = JSON.parse(res.text);
        obj.user.age.should.equal('1');
        obj.user.name.should.eql({ first: 'tobi', last: 'holowaychuk' });
        obj.species.should.equal('ferret');
        done();
      });
    })

    it('should support multiple files of the same name', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        req.files.text.should.have.length(2);
        req.files.text[0].constructor.name.should.equal('Object');
        req.files.text[1].constructor.name.should.equal('Object');
        res.end();
      });

      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="text"; filename="bar.txt"\r\n');
      test.write('\r\n');
      test.write('some more text stuff');
      test.write('\r\n--foo--');
      test.expect(200, done);
    })
    
    it('should support nested files', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        Object.keys(req.files.docs).should.have.length(2);
        req.files.docs.foo.originalFilename.should.equal('foo.txt');
        req.files.docs.bar.originalFilename.should.equal('bar.txt');
        res.end();
      });

      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-Disposition: form-data; name="docs[foo]"; filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('\r\n--foo\r\n');
      test.write('Content-Disposition: form-data; name="docs[bar]"; filename="bar.txt"\r\n');
      test.write('\r\n');
      test.write('some more text stuff');
      test.write('\r\n--foo--');
      test.expect(200, done);
    })
    
    it('should next(err) on multipart failure', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        res.end('whoop');
      });

      app.use(function(err, req, res, next){
        err.message.should.equal('Expected alphabetic character, received 61');
        res.statusCode = err.status;
        res.end('bad request');
      });

      var test = request(app).post('/');
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('Content-Disposition: form-data; name="text"; filename="bar.txt"\r\n');
      test.write('\r\n');
      test.write('some more text stuff');
      test.write('\r\n--foo--');
      test.expect(400, 'bad request', done);
    })

    it('should default req.files to {}', function(done){
      var app = connect();

      app.use(multipart());

      app.use(function(req, res){
        res.end(JSON.stringify(req.files));
      });

      request(app)
      .post('/')
      .expect(200, '{}', done);
    })
  })

  it('should return 400 on maxFilesSize exceeded', function(done){
    var app = connect();

    var exp = 9;
    app.use(multipart({ maxFilesSize: Math.pow(2, exp) }));

    app.use(function(req, res){
      res.end(JSON.stringify(req.files));
    });

    var str = 'x';
    for (var i = 0; i < exp + 1; i += 1) {
      str += str;
    }

    var test =request(app).post('/');
    test.set('Content-Type', 'multipart/form-data; boundary=foo');
    test.write('--foo\r\n');
    test.write('Content-Disposition: form-data; name="user[name]"\r\n');
    test.write('\r\n');
    test.write('Tobi');
    test.write('\r\n--foo\r\n');
    test.write('Content-Disposition: form-data; name="text"; filename="foo.txt"\r\n');
    test.write('\r\n');
    test.write(str);
    test.write('\r\n--foo--');
    test.expect(400, done);
  })
})
