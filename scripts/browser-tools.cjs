const fs=require('node:fs');
const path=require('node:path');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const output=path.resolve(__dirname,'../.preview');
class Browser {
  constructor(){this.sequence=0;this.pending=new Map();this.events=new Map();this.errors=[];}
  async connect(){
    const target=await(await fetch('http://127.0.0.1:9222/json/new?about:blank',{method:'PUT'})).json();
    this.socket=new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve,reject)=>{this.socket.onopen=resolve;this.socket.onerror=reject;});
    this.socket.onmessage=event=>{const message=JSON.parse(event.data);if(message.id){const p=this.pending.get(message.id);if(!p)return;this.pending.delete(message.id);message.error?p.reject(new Error(JSON.stringify(message.error))):p.resolve(message.result);}else(this.events.get(message.method)||[]).forEach(fn=>fn(message.params));};
    this.socket.addEventListener('close',()=>{for(const p of this.pending.values())p.reject(new Error('Browser disconnected'));this.pending.clear();});
    await this.send('Page.enable');await this.send('Runtime.enable');await this.send('Network.enable');await this.send('Network.setCacheDisabled',{cacheDisabled:true});await this.send('Emulation.setFocusEmulationEnabled',{enabled:true});
    this.events.set('Runtime.exceptionThrown',[e=>this.errors.push(e.exceptionDetails.exception?.description||e.exceptionDetails.text)]);
  }
  send(method,params={}){const id=++this.sequence;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));});}
  async eval(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||'Evaluation failed');return r.result.value;}
  async until(expression,timeout=10000){const start=Date.now();while(Date.now()-start<timeout){if(await this.eval(expression))return;await delay(80);}throw new Error('Timed out: '+expression);}
  async goto(url){await this.send('Page.navigate',{url});await this.until("document.readyState === 'complete' && document.body.dataset.albumReady === 'true'");}
  async viewport(width,height=900){await this.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});}
  async screenshot(name,full=false){const params={format:'jpeg',quality:78,captureBeyondViewport:full};if(full){const r=await this.send('Page.getLayoutMetrics');params.clip={x:0,y:0,width:r.cssContentSize.width,height:r.cssContentSize.height,scale:1};}const r=await this.send('Page.captureScreenshot',params);fs.writeFileSync(path.join(output,name+'.jpg'),Buffer.from(r.data,'base64'));}
  async revealAll(){await this.eval("(async()=>{for(let y=0;y<document.documentElement.scrollHeight;y+=600){scrollTo({top:y,behavior:'instant'});await new Promise(r=>setTimeout(r,60));}scrollTo({top:0,behavior:'instant'});})()");await delay(900);}
  async close(){await this.send('Page.close');this.socket.close();}
}
module.exports={Browser,delay,output};
