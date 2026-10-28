const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const {Browser,delay,output}=require('./browser-tools.cjs');
const browser=new Browser(),checks=[];
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:4173/';
const pass=message=>{checks.push(message);console.log('PASS '+message);};
let prefixServer;
async function overrideConfig(extra){
  const body=Buffer.from(fs.readFileSync(path.join(root,'album.config.js'),'utf8')+'\n'+extra).toString('base64');
  browser.events.set('Fetch.requestPaused',[event=>browser.send('Fetch.fulfillRequest',{requestId:event.requestId,responseCode:200,responseHeaders:[{name:'Content-Type',value:'text/javascript; charset=utf-8'}],body}).catch(e=>browser.errors.push(String(e)))]);
  await browser.send('Fetch.enable',{patterns:[{urlPattern:'*album.config.js',requestStage:'Request'}]});
}
async function clearOverride(){await browser.send('Fetch.disable');browser.events.delete('Fetch.requestPaused');}
async function key(key,code){await browser.send('Input.dispatchKeyEvent',{type:'keyDown',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});await browser.send('Input.dispatchKeyEvent',{type:'keyUp',key,code:key,windowsVirtualKeyCode:code,nativeVirtualKeyCode:code});}
(async()=>{
  await browser.connect();
  await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:"try{sessionStorage.setItem('everlume-opened-v1','yes')}catch{}"});
  await browser.goto(base+'gallery.html');await browser.eval("localStorage.clear()");
  for(const [file,page] of [['index.html','home'],['gallery.html','gallery'],['our-story.html','story'],['films.html','films']]){
    await browser.viewport(1440);await browser.goto(base+file);
    assert.equal(await browser.eval("document.querySelector('[aria-current=page]').dataset.nav"),page);
    assert.equal(await browser.eval("!!document.querySelector('#book-intro')"),page==='home');
    if(page==='gallery')assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),20);
    if(page==='story')assert.equal(await browser.eval("document.querySelectorAll('.chapter').length"),4);
    if(page==='films'){
      assert.equal(await browser.eval("document.querySelectorAll('.film-play').length"),3);
      assert.equal(await browser.eval("document.querySelector('#film-player').hasAttribute('src')"),false);
      assert.equal(await browser.eval("document.querySelector('#films-message').hidden"),true);
    }
    await browser.eval("Promise.all([...document.querySelectorAll('[data-image]')].map(i=>{i.loading='eager';return i.decode().catch(()=>{});}))");
    assert.deepEqual(await browser.eval("[...document.querySelectorAll('[data-image]')].filter(i=>!i.naturalWidth).map(i=>i.dataset.image)"),[]);
    await browser.revealAll();
    for(const width of [1440,768,390,360]){
      await browser.viewport(width,width<700?844:900);await delay(150);
      const overflow=await browser.eval('document.documentElement.scrollWidth>innerWidth');
      if(overflow)console.log(await browser.eval("[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,cls:e.className,right:e.getBoundingClientRect().right})).slice(0,15)"));
      assert.equal(overflow,false,`${page} overflow at ${width}`);
      assert.equal(await browser.eval("[...document.querySelectorAll('[lang=si]')].every(n=>n.textContent.trim())"),true);
      if(width<900){await browser.eval("document.querySelector('#menu-toggle').click()");assert.equal(await browser.eval("document.querySelector('#menu-toggle').getAttribute('aria-expanded')"),'true');assert.equal(await browser.eval("[...document.querySelectorAll('.site-nav a')].filter(a=>a.getBoundingClientRect().height>0).length"),4);await key('Escape',27);assert.equal(await browser.eval('document.activeElement.id'),'menu-toggle');}
      await browser.screenshot(`${page}-${width}-full`,true);
      if(width===1440||width===390)await browser.screenshot(`${page}-${width}-top`);
      pass(`${page}: ${width}px layout, Sinhala and navigation`);
    }
  }
  await browser.goto(base+'gallery.html');
  for(const [category,count] of [['ready',3],['ceremony',3],['together',8],['celebration',3],['details',3],['all',20]]){
    await browser.eval(`document.querySelector('[data-category="${category}"]').click()`);
    assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),count);
    assert.equal(await browser.eval("document.querySelector('#gallery-status').textContent"),`${count} photographs`);
  }
  await browser.goto(base+'gallery.html?category=ceremony');
  assert.equal(await browser.eval("document.querySelector('.filter-button[aria-pressed=true]').dataset.category"),'ceremony');
  await browser.eval("document.querySelector('.gallery-card button').click()");
  assert.equal(await browser.eval("document.querySelector('#viewer-count').textContent"),'01 / 03');
  await browser.eval("document.querySelector('#viewer-prev').click()");
  assert.equal(await browser.eval("document.querySelector('#viewer-count').textContent"),'03 / 03');
  assert.equal(await browser.eval("document.querySelector('#viewer-caption').textContent"),'Written into our story');
  await key('ArrowRight',39);assert.equal(await browser.eval("document.querySelector('#viewer-count').textContent"),'01 / 03');
  await key('Escape',27);assert.equal(await browser.eval('document.activeElement.dataset.photo'),'ring-exchange');
  await browser.eval("document.querySelector('[data-category=ready]').click()");await browser.eval('history.back()');await browser.until("document.querySelector('.filter-button[aria-pressed=true]').dataset.category === 'ceremony'");
  await browser.eval('history.forward()');await browser.until("document.querySelector('.filter-button[aria-pressed=true]').dataset.category === 'ready'");
  await browser.goto(base+'gallery.html?category=does-not-exist');assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),20);
  pass('Category counts, deep links, invalid category fallback, viewer ordering and browser history');

  await browser.goto(base+'gallery.html');
  assert.ok(await browser.eval("document.querySelectorAll('.reveal-pending').length")>0);
  await browser.eval("document.querySelector('.gallery-card.reveal-pending button').focus()");
  assert.equal(await browser.eval("!!document.activeElement.closest('.reveal-pending')"),false);
  await browser.eval("document.querySelector('#motion-toggle').click()");
  assert.equal(await browser.eval("document.querySelectorAll('.reveal-pending').length"),0);
  await browser.goto(base+'our-story.html');assert.equal(await browser.eval("document.querySelector('#motion-label').textContent"),'Motion off');assert.equal(await browser.eval("document.querySelectorAll('.reveal-pending').length"),0);
  await browser.eval("document.querySelector('#motion-toggle').click()");
  await browser.send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await browser.until("document.querySelector('#motion-toggle').disabled");assert.equal(await browser.eval("document.querySelectorAll('.reveal-pending').length"),0);
  await browser.send('Emulation.setEmulatedMedia',{features:[]});
  await browser.send('Page.addScriptToEvaluateOnNewDocument',{source:'window.IntersectionObserver=undefined;'}).then(async({identifier})=>{
    await browser.goto(base+'gallery.html');assert.equal(await browser.eval("document.querySelectorAll('.reveal-pending').length"),0);await browser.send('Page.removeScriptToEvaluateOnNewDocument',{identifier});
  });
  pass('Focus immediately reveals content; motion preferences persist across pages; no-observer fallback remains visible');

  await overrideConfig("window.ALBUM.gallery=Array.from({length:200},(_,i)=>{const key='test-'+i;window.ALBUM.images[key]={...window.ALBUM.images.formal,caption:'Test photograph '+i,category:i%2?'ready':'together'};return key;});");
  await browser.goto(base+'gallery.html');assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),24);
  await browser.eval("document.querySelector('.gallery-card button').click();document.querySelector('#viewer-prev').click()");assert.equal(await browser.eval("document.querySelector('#viewer-count').textContent"),'200 / 200');assert.equal(await browser.eval("document.querySelector('#viewer-caption').textContent"),'Test photograph 199');await browser.eval("document.querySelector('#viewer-close').click()");
  await browser.eval("document.querySelector('#load-more').click()");assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),48);
  await browser.eval("while(!document.querySelector('#load-more').hidden)document.querySelector('#load-more').click()");assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),200);
  await browser.eval("document.querySelector('[data-category=ready]').click()");assert.equal(await browser.eval("document.querySelectorAll('.gallery-card').length"),24);assert.equal(await browser.eval("document.querySelector('#gallery-status').textContent"),'100 photographs');
  await clearOverride();pass('200-photo collection: batching, complete filtered viewer and Show more');

  await overrideConfig("window.ALBUM.films[0].source='.preview/test-film.mp4';window.ALBUM.films[1].source='assets/video/missing.mp4';");
  await browser.goto(base+'films.html');assert.equal(await browser.eval("document.querySelector('#film-player').hasAttribute('src')"),false);
  await browser.eval("document.querySelector('.film-play').click()");await browser.until("document.querySelector('#film-player').readyState >= 1");assert.equal(await browser.eval("document.querySelector('#film-player').paused"),true);
  await browser.eval("document.querySelector('#film-player').play()");await browser.until("document.querySelector('#film-player').currentTime > .2");
  await browser.eval("document.querySelector('#film-close').click()");assert.equal(await browser.eval("document.querySelector('#film-player').paused && !document.querySelector('#film-player').hasAttribute('src')"),true);assert.equal(await browser.eval("document.activeElement.className"),'film-play');
  await browser.eval("document.querySelectorAll('.film-play')[1].click()");await browser.until("!document.querySelector('#film-error').hidden");await key('Escape',27);
  const range=await fetch(base+'.preview/test-film.mp4',{headers:{Range:'bytes=0-127'}});assert.equal(range.status,206);assert.equal(range.headers.get('content-type'),'video/mp4');assert.equal((await range.arrayBuffer()).byteLength,128);
  await clearOverride();pass('Video loads on request, does not autoplay, plays, stops on close and handles missing footage');

  for(const file of ['index.html','gallery.html','our-story.html','films.html']){
    await browser.goto(pathToFileURL(path.join(root,file)).href+'#main-content');
    assert.equal(await browser.eval('document.body.dataset.albumReady'),'true');
  }
  pass('All four pages open directly as local files');
  prefixServer=spawn(process.execPath,[path.join(root,'server.cjs')],{cwd:root,env:{...process.env,PORT:'4174',ALBUM_BASE_PATH:'/Wedding_Album_SA'},stdio:'ignore'});
  for(let i=0;i<40;i++){try{if((await fetch('http://127.0.0.1:4174/Wedding_Album_SA/')).ok)break;}catch{}await delay(100);}
  for(const file of ['index.html','gallery.html','our-story.html','films.html']){
    await browser.goto('http://127.0.0.1:4174/Wedding_Album_SA/'+file);
    assert.equal(await browser.eval("[...document.querySelectorAll('.site-nav a')].every(a=>new URL(a.href).pathname.startsWith('/Wedding_Album_SA/'))"),true);
    await browser.eval("(()=>{const image=document.querySelector('[data-image]');image.loading='eager';return image.decode()})()");
    assert.equal(await browser.eval("document.querySelector('[data-image]').naturalWidth>0"),true);
  }
  pass('Relative navigation and assets work under a GitHub Pages-style subdirectory');
  assert.deepEqual(browser.errors,[]);pass('No JavaScript runtime exceptions across all pages');
  fs.writeFileSync(path.join(output,'multipage-results.json'),JSON.stringify({checks,errors:browser.errors},null,2));
  console.log(`${checks.length} checks passed.`);await browser.close();
})().catch(error=>{console.error(error);fs.writeFileSync(path.join(output,'multipage-results.json'),JSON.stringify({checks,errors:browser.errors,failure:String(error)},null,2));browser.socket?.close();process.exitCode=1;}).finally(()=>prefixServer?.kill());
