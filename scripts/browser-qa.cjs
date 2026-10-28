// Dependency-free browser checks. Start a dedicated headless Chrome on port 9222 first.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const output = path.resolve(__dirname, '../.preview');
fs.mkdirSync(output, {recursive:true});
let sequence = 0;
let socket;
const pending = new Map();
const events = new Map();
const checks = [];
const errors = [];
async function connect() {
  const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', {method:'PUT'})).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.addEventListener('close', event => { for (const item of pending.values()) item.reject(new Error('Chrome debugging connection closed: ' + event.code + ' ' + event.reason)); pending.clear(); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id);
      if (message.error) item.reject(new Error(JSON.stringify(message.error)));
      else item.resolve(message.result);
    } else {
      (events.get(message.method) || []).forEach(callback => callback(message.params));
    }
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');
  events.set('Runtime.exceptionThrown', [event => errors.push(event.exceptionDetails.text + ': ' + (event.exceptionDetails.exception?.description || ''))]);
}
function send(method,params = {}) {
  const id = ++sequence;
  return new Promise((resolve,reject) => { pending.set(id,{resolve,reject}); socket.send(JSON.stringify({id,method,params})); });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || 'Evaluation failed');
  return result.result.value;
}
async function until(expression,timeout = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await evaluate(expression)) return;
    await delay(100);
  }
  throw new Error('Timed out waiting for: ' + expression);
}
async function screenshot(name, fullPage = false) {
  const metrics = await send('Page.getLayoutMetrics');
  const params = {format:fullPage ? 'jpeg' : 'png',captureBeyondViewport:fullPage};
  if (fullPage) params.quality = 75;
  if (fullPage) params.clip = {x:0,y:0,width:metrics.cssContentSize.width,height:metrics.cssContentSize.height,scale:1};
  const data = await send('Page.captureScreenshot',params);
  fs.writeFileSync(path.join(output,name + (fullPage ? '.jpg' : '.png')),Buffer.from(data.data,'base64'));
}
async function viewport(width,height = 900) {
  await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width < 700});
}
async function navigate() {
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});
  await until("document.readyState === 'complete' && !!window.ALBUM");
}
function pass(name) { checks.push(name); console.log('PASS ' + name); }

(async () => {
  await connect();
  await viewport(1440);
  if (process.argv.includes('--mobile-book')) {
    await viewport(390,844);
    await send('Page.navigate',{url:'http://127.0.0.1:4173/#story'});
    await until("document.readyState === 'complete' && !!window.ALBUM");
    await evaluate("document.querySelector('#replay').click()");
    await delay(200);
    await screenshot('book-mobile-closed');
    await until("document.querySelector('#book').classList.contains('is-opening')");
    await delay(1400);
    await screenshot('book-mobile-opening');
    await until("!document.querySelector('#book-intro').open");
    await send('Page.close');
    socket.close();
    return;
  }
  if (process.argv.includes('--preview-only')) {
    await send('Page.navigate',{url:'http://127.0.0.1:4173/#story'});
    await until("document.readyState === 'complete' && !!window.ALBUM");
    await delay(800);
    await screenshot('hero-desktop-preview');
    await viewport(390,844);
    await delay(300);
    await screenshot('hero-mobile-preview');
    await send('Page.close');
    socket.close();
    return;
  }
  await navigate();
  await evaluate("sessionStorage.clear(); localStorage.clear()");
  await navigate();
  await until("document.querySelector('#book-intro').open");
  await screenshot('book-closed');
  await until("document.querySelector('#book').classList.contains('is-opening')");
  await delay(1100);
  await screenshot('book-opening');
  await until("!document.querySelector('#book-intro').open");
  assert.equal(await evaluate("document.body.classList.contains('modal-open')"),false);
  pass('First visit automatically opens the dimensional book and restores scrolling');

  await evaluate("document.querySelector('#replay').click()");
  await until("document.querySelector('#book-intro').open");
  await evaluate("document.querySelector('#skip-intro').click()");
  await until("!document.querySelector('#book-intro').open");
  assert.equal(await evaluate('document.activeElement.id'),'replay');
  pass('Replay, Skip and focus restoration');
  await navigate();
  assert.equal(await evaluate("document.querySelector('#book-intro').open"),false);
  pass('Repeat visit skips the introduction');

  // Decode all photographs to test the complete page, including lazy-loaded sections.
  await evaluate("Promise.all([...document.querySelectorAll('img[data-image]')].map(i => { i.loading='eager'; return i.decode().catch(() => {}); }))");
  const broken = await evaluate("[...document.querySelectorAll('img[data-image]')].filter(i => !i.naturalWidth).map(i => i.dataset.image)");
  assert.deepEqual(broken,[]);
  pass('All generated photographs load');
  for (const width of [1440,768,390,360]) {
    await viewport(width,width < 700 ? 844 : 900);
    await evaluate('window.scrollTo(0,0)');
    await delay(300);
    const overflow = await evaluate('document.documentElement.scrollWidth > innerWidth');
    if (overflow) console.log(await evaluate("[...document.querySelectorAll('body *')].filter(e => { const r=e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1); }).map(e => ({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right})).slice(0,25)"));
    assert.equal(overflow,false,'Horizontal overflow at ' + width);
    assert.equal(await evaluate("document.querySelectorAll('.petal-track').length"),width < 700 ? 5 : 10);
    const brokenText = await evaluate("[...document.querySelectorAll('[lang=si]')].some(e => !e.textContent.trim())");
    assert.equal(brokenText,false);
    await screenshot('album-' + width, true);
    if (width === 1440 || width === 390) await screenshot('hero-' + width);
    pass(width + 'px layout: no horizontal overflow, correct petal count, Sinhala text present');
  }
  await viewport(1440);
  await evaluate("document.querySelector('[data-photo=formal]').click()");
  await until("document.querySelector('#lightbox').open");
  assert.equal(await evaluate('document.activeElement.id'),'viewer-close');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight'});
  assert.equal(await evaluate("document.querySelector('#viewer-count').textContent"),'02 / 08');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowLeft'});
  assert.equal(await evaluate("document.querySelector('#viewer-count').textContent"),'01 / 08');
  await evaluate("document.querySelector('#viewer-prev').click()");
  assert.equal(await evaluate("document.querySelector('#viewer-count').textContent"),'08 / 08');
  await evaluate("document.querySelector('#viewer-next').click()");
  assert.equal(await evaluate("document.querySelector('#viewer-count').textContent"),'01 / 08');
  await screenshot('photo-viewer');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27,nativeVirtualKeyCode:27});
  await until("!document.querySelector('#lightbox').open");
  assert.equal(await evaluate('document.activeElement.dataset.photo'),'formal');
  pass('Photo viewer, arrow keys, buttons, wraparound, Escape and focus restoration');

  await viewport(390,844);
  await evaluate("document.querySelector('[data-photo=formal]').click()");
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:300,y:350}]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:180,y:355}]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await delay(150);
  assert.equal(await evaluate("document.querySelector('#viewer-count').textContent"),'02 / 08');
  await evaluate("document.querySelector('#viewer-close').click()");
  pass('Touch swipe advances the photo viewer');

  await evaluate("document.querySelector('#motion-toggle').click()");
  assert.equal(await evaluate("document.body.classList.contains('motion-paused')"),true);
  await navigate();
  assert.equal(await evaluate("document.querySelector('#motion-toggle').getAttribute('aria-pressed')"),'false');
  await evaluate("document.querySelector('#motion-toggle').click()");
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await until("document.querySelector('#motion-toggle').disabled");
  await evaluate('sessionStorage.clear()');
  await navigate();
  assert.equal(await evaluate("document.querySelector('#book-intro').open"),false);
  assert.equal(await evaluate("getComputedStyle(document.querySelector('#petals')).display"),'none');
  pass('Motion preference persists; reduced motion disables petals and automatic opening');
  await send('Emulation.setEmulatedMedia',{features:[]});

  await evaluate("const i=document.querySelector('[data-image=walking]');i.removeAttribute('srcset');i.src='assets/images/missing-test.jpg'");
  await until("document.querySelector('[data-photo=walking]').disabled");
  pass('Missing photo shows a fallback and disables its unavailable viewer link');

  await send('Network.setCacheDisabled',{cacheDisabled:true});
  await evaluate('sessionStorage.clear()');
  await send('Fetch.enable',{patterns:[{urlPattern:'*cover-960.jpg',requestStage:'Request'}]});
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});
  await until("!!window.ALBUM && document.querySelector('#book-intro').open");
  await evaluate("document.querySelector('#skip-intro').click()");
  await until("!document.querySelector('#book-intro').open",2000);
  pass('Skip remains available while the cover image is stalled');
  await send('Fetch.disable');
  await send('Network.setBlockedURLs',{urls:['*cover-960.jpg']});
  await evaluate('sessionStorage.clear()');
  await send('Page.navigate',{url:'http://127.0.0.1:4173/'});
  await until("!!window.ALBUM && document.querySelector('#book-intro').open");
  await until("!document.querySelector('#book-intro').open",9000);
  pass('Missing cover cannot trap the visitor in the introduction');
  await send('Network.setBlockedURLs',{urls:[]});

  assert.deepEqual(errors,[]);
  pass('No JavaScript runtime exceptions');
  fs.writeFileSync(path.join(output,'qa-results.json'),JSON.stringify({checks,errors},null,2));
  console.log(`${checks.length} checks passed. Screenshots in .preview/`);
  await send('Page.close');
  socket.close();
})().catch(error => {
  console.error(error);
  fs.writeFileSync(path.join(output,'qa-results.json'),JSON.stringify({checks,errors,failure:String(error)},null,2));
  socket?.close();
  process.exitCode = 1;
});
