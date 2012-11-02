var http = require('http');
var fs = require('fs');
var path = require('path');
var url = require('url');

var mimeTypes = {
  "html": "text/html",
  "jpeg": "image/jpeg",
  "jpg": "image/jpeg",
  "png": "image/png",
  "js": "text/javascript",
  "css": "text/css"
};

function isDir(path) {
  try {
    var stats = fs.lstatSync(path);
    if (stats.isDirectory()) {
        return true;
    }
    else {
      return false;
    }
  }
  catch (e) {
    return false;
  }
}

http.createServer(function (request, response) {
    var body = '';
    request.on('data', function (data) {
      body += data;
    });
    request.on('end', function () {
      var uri = url.parse(request.url).pathname;
      var urlParams = url.parse(request.url, true).query;
      if (uri == "/") {
        if (urlParams.get !== undefined) {
          response.writeHead(200, { 'Content-Type' : "plain/txt" });
          response.end(fs.readFileSync("/Users/vorg/Dropbox/Tasks/tasks.taskpaper", "utf-8"));
        }
        else if (urlParams.set !== undefined) {
          responseStr = fs.writeFileSync("/Users/vorg/Dropbox/Tasks/tasks.taskpaper", body);
          fs.writeFileSync("/Users/vorg/Documents/Bak/Tasks/" + (new Date()).getTime() + ".taskpaper", body);
          response.writeHead(200, { 'Content-Type' : "plain/txt" });
          response.end("ok");
        }
        else {
          uri = "/index.html";
        }
      }

      var filename = path.join(process.cwd(), uri);
      fs.exists(filename, function(exists) {
        if (exists && !isDir(filename)) {
          var mimeType = mimeTypes[path.extname(filename).split(".")[1]];
          response.writeHead(200, mimeType);

          var fileStream = fs.createReadStream(filename);
          fileStream.pipe(response);
        }
        else {
        }
      });
   });
}).listen(3001);