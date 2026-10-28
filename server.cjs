const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const basePath = process.env.ALBUM_BASE_PATH || '';
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json; charset=utf-8', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4' };
const server = http.createServer((req,res) => {
  let filename;
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if(basePath) { if(!pathname.startsWith(basePath + '/')) { res.writeHead(404).end(); return; } pathname=pathname.slice(basePath.length); }
    filename = path.resolve(root, '.' + pathname);
  }
  catch { res.writeHead(400).end(); return; }
  if (filename !== root && !filename.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (filename === root) filename = path.join(root, 'index.html');
  fs.stat(filename, (error, stat) => {
    if (error || !stat.isFile()) { res.writeHead(404).end('Not found'); return; }
    const headers = {'Content-Type':types[path.extname(filename)] || 'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
    let start=0,end=stat.size-1,status=200;
    if(req.headers.range) {
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match || (!match[1] && !match[2])) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end(); return; }
      start=match[1] ? Number(match[1]) : Math.max(0,stat.size-Number(match[2]));
      end=match[1] && match[2] ? Math.min(Number(match[2]),stat.size-1) : stat.size-1;
      if(start>end || start>=stat.size) { res.writeHead(416,{'Content-Range':`bytes */${stat.size}`}).end(); return; }
      headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;status=206;
    }
    headers['Content-Length']=Math.max(0,end-start+1);res.writeHead(status,headers);
    if(req.method==='HEAD' || !stat.size) {res.end();return;}
    fs.createReadStream(filename,{start,end}).pipe(res);
  });
});
server.listen(process.env.PORT || 4173, '127.0.0.1', () => console.log('Album preview: http://localhost:' + server.address().port));
