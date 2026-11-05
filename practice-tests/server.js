// Zero-dependency local server: `node server.js` then open http://localhost:3000
const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const files = {
  "/": ["index.html", "text/html"],
  "/index.html": ["index.html", "text/html"],
  "/app.js": ["app.js", "text/javascript"],
  "/questions.js": ["questions.js", "text/javascript"],
};

http.createServer((req, res) => {
  const f = files[req.url.split("?")[0]];
  if (!f) { res.writeHead(404); return res.end("Not found"); }
  res.writeHead(200, { "Content-Type": f[1] + "; charset=utf-8" });
  fs.createReadStream(path.join(__dirname, f[0])).pipe(res);
}).listen(PORT, () => console.log(`A+ practice tests running at http://localhost:${PORT}`));
