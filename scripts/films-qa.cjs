const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {Browser,output}=require('./browser-tools.cjs');
const browser=new Browser();
(async()=>{
  await browser.connect();await browser.viewport(1440);
  await browser.goto('http://127.0.0.1:4173/films.html');
  assert.equal(await browser.eval("document.querySelectorAll('.film-play').length"),3);
  assert.equal(await browser.eval("document.querySelector('#films-message').hidden"),true);
  assert.equal(await browser.eval("[...document.querySelectorAll('.film-badge')].every(n=>n.textContent==='PHOTO FILM')"),true);
  assert.equal(await browser.eval("document.querySelector('#film-player').hasAttribute('src')"),false);
  const results=[];
  for(let index=0;index<3;index++){
    await browser.eval(`document.querySelectorAll('.film-play')[${index}].click()`);
    await browser.until("document.querySelector('#film-player').readyState>=2");
    const metadata=await browser.eval("(()=>{const v=document.querySelector('#film-player');return {width:v.videoWidth,height:v.videoHeight,duration:v.duration,paused:v.paused}})()");
    assert.equal(metadata.width,1280);assert.equal(metadata.height,720);assert.ok(Math.abs(metadata.duration-21)<.1);assert.equal(metadata.paused,true);
    await browser.eval("document.querySelector('#film-player').play()");
    await browser.until("document.querySelector('#film-player').currentTime>.25");
    await browser.eval("document.querySelector('#film-player').pause();document.querySelector('#film-player').currentTime=8");
    await browser.until("!document.querySelector('#film-player').seeking");
    await browser.screenshot(`film-${index+1}-playback`);
    await browser.eval("document.querySelector('#film-close').click()");
    assert.equal(await browser.eval("document.querySelector('#film-player').paused&&!document.querySelector('#film-player').hasAttribute('src')"),true);
    results.push({film:index+1,...metadata,playback:true,seeking:true,closeStopsPlayback:true});
  }
  for(const width of [360,390,768,1440]){
    await browser.viewport(width);await browser.revealAll();
    assert.equal(await browser.eval('document.documentElement.scrollWidth>innerWidth'),false);
  }
  await browser.screenshot('films-ready-desktop',true);
  assert.deepEqual(browser.errors,[]);
  fs.writeFileSync(path.join(output,'films-results.json'),JSON.stringify({results,viewports:[360,390,768,1440],errors:browser.errors},null,2));
  console.log('PASS: all 3 actual films load, play, seek and stop on close; four layouts fit; no runtime errors.');
  await browser.close();
})().catch(error=>{console.error(error);browser.socket?.close();process.exitCode=1});
