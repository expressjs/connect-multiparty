
process.env.NODE_ENV = 'test';

var Buffer = require('safe-buffer').Buffer
var connect = require('connect');
var multipart = require('..');
var request = require('supertest');
var should = require('should');

describe('multipart()', function(){
  it('should ignore GET', function(done){
    request(createServer())
    .get('/body')
    .field('user', 'Tobi')
    .expect(200, {}, done)
  })

  describe('with multipart/form-data', function(){
    it('should populate req.body', function(done){
      request(createServer())
      .post('/body')
      .field('user', 'Tobi')
      .expect(200, { user: 'Tobi' }, done)
    })

    it('should handle duplicated middleware', function (done) {
      var app = connect()
      .use(multipart())
      .use(multipart())
      .use(function (req, res) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8')
        res.end(JSON.stringify(req.body))
      })

      request(app)
      .post('/body')
      .field('user', 'Tobi')
      .expect(200, { user: 'Tobi' }, done)
    })

    it('should support files', function(done){
      request(createServer())
      .post('/files')
      .attach('text', Buffer.from('some text here'), 'foo.txt')
      .expect(200)
      .expect(shouldDeepIncludeInBody({
        text: {
          name: 'foo.txt',
          originalFilename: 'foo.txt',
          size: 14,
          type: 'text/plain'
        }
      }))
      .end(done)
    })

    it('should work with multiple fields', function(done){
      request(createServer())
      .post('/body')
      .field('user', 'Tobi')
      .field('age', '1')
      .expect(200, { user: 'Tobi', age: '1' }, done)
    })

    it('should handle duplicated fields', function (done) {
      request(createServer())
      .post('/body')
      .field('user', 'Tobi')
      .field('user', 'Loki')
      .field('user', 'Poki')
      .expect(200, { user: [ 'Tobi', 'Loki', 'Poki' ] }, done)
    })

    it('should support nesting', function(done){
      request(createServer())
      .post('/body')
      .field('user[name][first]', 'tobi')
      .field('user[name][last]', 'holowaychuk')
      .field('user[age]', '1')
      .field('species', 'ferret')
      .expect(200, {
        species: 'ferret',
        user: {
          age: '1',
          name: { first: 'tobi', last: 'holowaychuk' }
        }
      }, done)
    })

    it('should support multiple files of the same name', function(done){
      request(createServer())
      .post('/files')
      .attach('text', Buffer.from('some text here'), 'foo.txt')
      .attach('text', Buffer.from('some more text stuff'), 'bar.txt')
      .expect(200)
      .expect(shouldDeepIncludeInBody({
        text: [
          { name: 'foo.txt' },
          { name: 'bar.txt' }
        ]
      }))
      .end(done)
    })

    it('should support nested files', function(done){
      request(createServer())
      .post('/files')
      .attach('docs[foo]', Buffer.from('some text here'), 'foo.txt')
      .attach('docs[bar]', Buffer.from('some more text stuff'), 'bar.txt')
      .expect(200)
      .expect(shouldDeepIncludeInBody({
        docs: {
          foo: { name: 'foo.txt' },
          bar: { name: 'bar.txt' }
        }
      }))
      .end(done)
    })

    it('should next(err) on multipart failure', function(done){
      var test = request(createServer()).post('/')
      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('Content-Disposition: form-data; name="text"; filename="bar.txt"\r\n');
      test.write('\r\n');
      test.write('some more text stuff');
      test.write('\r\n--foo--');
      test.expect(400, /Error: Expected alphabetic character, received 61/, done)
    })

    it('should not hang request on failure', function(done){
      var buff = Buffer.alloc(1024 * 10, '.')
      var test = request(createServer()).post('/')

      test.set('Content-Type', 'multipart/form-data; boundary=foo');
      test.write('--foo\r\n');
      test.write('Content-filename="foo.txt"\r\n');
      test.write('\r\n');
      test.write('some text here');
      test.write('Content-Disposition: form-data; name="text"; filename="bar.txt"\r\n');
      test.write('\r\n');
      test.write('some more text stuff');
      test.write('\r\n--foo--');
      test.write(buff)
      test.write(buff)
      test.write(buff)
      test.expect(400, /Error: Expected alphabetic character, received 61/, done)
    })

    it('should default req.files to {}', function(done){
      request(createServer())
      .post('/body')
      .expect(200, {}, done)
    })

    it('should return 400 on maxFilesSize exceeded', function(done){
      var max = Math.pow(2, 9)

      request(createServer({ maxFilesSize: max }))
      .post('/files')
      .field('user[name]', 'Tobi')
      .attach('text', Buffer.alloc(max + 1, 'x'), 'foo.txt')
      .expect(400, done);
    })
  })
})

function createServer (opts) {
  var app = connect()

  app.use(multipart(opts))

  app.use('/body', function (req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(req.body))
  })

  app.use('/files', function (req, res) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(req.files))
  })

  return app
}

function shouldDeepIncludeInBody (obj) {
  return function (res) {
    should(res.body).containDeep(obj)
  }
}
