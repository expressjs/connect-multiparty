
process.env.NODE_ENV = 'test';

var connect = require('connect');
var multipart = require('..');
var request = require('supertest');
var should = require('should');

describe('multipart()', function(){
  it('should ignore GET', function(done){
    request(createServer())
    .get('/body')
    .field('user', 'Tobi')
    .expect(200, '{}', done);
  })

  describe('with multipart/form-data', function(){
    it('should populate req.body', function(done){
      request(createServer())
      .post('/body')
      .field('user', 'Tobi')
      .expect(200, '{"user":"Tobi"}', done);
    })

    it('should support files', function(done){
      var app = createServer()

      app.use(function(req, res){
        should(req.body.user).eql({ name: 'Tobi' });
        req.files.text.path.should.endWith('.txt');
        req.files.text.constructor.name.should.equal('Object');
        res.end(req.files.text.originalFilename);
      });

      request(app)
      .post('/')
      .field('user[name]', 'Tobi')
      .attach('text', new Buffer('some text here'), 'foo.txt')
      .expect(200, 'foo.txt', done);
    })
    
    it('should keep extensions', function(done){
      var app = createServer()

      app.use(function(req, res){
        should(req.body.user).eql({ name: 'Tobi' });
        req.files.text.path.should.endWith('.txt');
        req.files.text.constructor.name.should.equal('Object');
        res.end(req.files.text.originalFilename);
      });

      request(app)
      .post('/')
      .field('user[name]', 'Tobi')
      .attach('text', new Buffer('some text here'), 'foo.txt')
      .expect(200, 'foo.txt', done);
    })
    
    it('should work with multiple fields', function(done){
      request(createServer())
      .post('/body')
      .field('user', 'Tobi')
      .field('age', '1')
      .expect(200, '{"user":"Tobi","age":"1"}', done);
    })
    
    it('should support nesting', function(done){
      request(createServer())
      .post('/body')
      .field('user[name][first]', 'tobi')
      .field('user[name][last]', 'holowaychuk')
      .field('user[age]', '1')
      .field('species', 'ferret')
      .expect(200, function(err, res){
        if (err) return done(err);
        var obj = JSON.parse(res.text);
        obj.user.age.should.equal('1');
        obj.user.name.should.eql({ first: 'tobi', last: 'holowaychuk' });
        obj.species.should.equal('ferret');
        done();
      });
    })

    it('should support multiple files of the same name', function(done){
      var app = createServer()

      app.use(function(req, res){
        req.files.text.should.have.length(2);
        req.files.text[0].constructor.name.should.equal('Object');
        req.files.text[1].constructor.name.should.equal('Object');
        res.end();
      });

      request(app)
      .post('/')
      .attach('text', new Buffer('some text here'), 'foo.txt')
      .attach('text', new Buffer('some more text stuff'), 'bar.txt')
      .expect(200, done);
    })
    
    it('should support nested files', function(done){
      var app = createServer()

      app.use(function(req, res){
        Object.keys(req.files.docs).should.have.length(2);
        req.files.docs.foo.originalFilename.should.equal('foo.txt');
        req.files.docs.bar.originalFilename.should.equal('bar.txt');
        res.end();
      });

      request(app)
      .post('/')
      .attach('docs[foo]', new Buffer('some text here'), 'foo.txt')
      .attach('docs[bar]', new Buffer('some more text stuff'), 'bar.txt')
      .expect(200, done);
    })
    
    it('should next(err) on multipart failure', function(done){
      var app = createServer()

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

    it('should not hang request on failure', function(done){
      var app = createServer()
      var buf = new Buffer(1024 * 10);

      app.use(function(err, req, res, next){
        err.message.should.equal('Expected alphabetic character, received 61');
        res.statusCode = err.status;
        res.end('bad request');
      });

      buf.fill('.');

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
      test.write(buf);
      test.write(buf);
      test.write(buf);
      test.expect(400, 'bad request', done);
    })

    it('should default req.files to {}', function(done){
      request(createServer())
      .post('/body')
      .expect(200, '{}', done);
    })

    it('should return 400 on maxFilesSize exceeded', function(done){
      var exp = 9;
      var str = 'x';
      for (var i = 0; i < exp + 1; i += 1) {
        str += str;
      }

      request(createServer({ maxFilesSize: Math.pow(2, exp) }))
      .post('/files')
      .field('user[name]', 'Tobi')
      .attach('text', new Buffer(str), 'foo.txt')
      .expect(400, done);
    })
  })
})

function createServer (opts) {
  var app = connect()

  app.use(multipart(opts))

  app.use('/body', function (req, res) {
    res.end(JSON.stringify(req.body))
  })

  app.use('/files', function (req, res) {
    res.end(JSON.stringify(req.files))
  })

  return app
}
