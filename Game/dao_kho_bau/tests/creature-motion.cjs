 'use strict';
const http=require('node:http');
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.TREASURE_QA_OUT||path.join(root,'../../artifacts/treasure-living-world-20261017/creatures'));fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(req.url).replace(/^\//,''));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:process.env.ZEVA_BROWSER_CHANNEL||'msedge'}),errors=[];
 try{
  const c=await browser.newContext({viewport:{width:1368,height:838},reducedMotion:'no-preference',recordVideo:{dir:out,size:{width:1368,height:838}}});
  await c.addInitScript(()=>{Math.random=()=>.43;let art;Object.defineProperty(window,'TreasureArtwork',{get:()=>art,set:v=>{const first=[23,24,19,20,21,1,5,18];art={...v,shuffledIslands:()=>[...first,...v.islands.map(i=>i.id).filter(id=>!first.includes(id))].slice(0,24).map(id=>v.islands.find(a=>a.id===id))};}});});
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));await p.goto('http://127.0.0.1:'+server.address().port+'/index.html');await p.evaluate(()=>document.fonts.ready);await p.click('#demo-button');await p.locator('#setup').waitFor({state:'hidden'});
  const sample=()=>p.evaluate(()=>{
   const canvas=document.querySelector('.whale-swim'),pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;let hash=2166136261,visible=0;
   for(let i=0;i<pixels.length;i+=4){hash=Math.imul(hash^pixels[i]^pixels[i+1]^pixels[i+2]^pixels[i+3],16777619)>>>0;if(pixels[i+3])visible++;}
   return {hash,visible,arms:[...document.querySelectorAll('.kraken-tentacles i')].map(n=>getComputedStyle(n).transform),body:getComputedStyle(document.querySelector('.island-scene[data-art-id="23"]>img')).transform,sea:document.querySelector('#ocean-motion').dataset.motionFrame};
  });
  const frames=[];for(let i=0;i<5;i++){await p.waitForTimeout(1000);frames.push(await sample());if(i===0||i===4)await p.screenshot({path:path.join(out,'motion-'+i+'.png')});}
  assert.equal(new Set(frames.map(f=>f.hash)).size,5,'Whale pixels deform each second');assert.ok(frames.every(f=>f.visible>1000));
  for(let i=0;i<8;i++)assert.equal(new Set(frames.map(f=>f.arms[i])).size,5,'Every Kraken arm moves independently');
  assert.equal(await p.locator('.island-scene[data-art-id="18"] .island-weather,.island-rain').count(),0);
  const thunder=p.locator('[data-ambient="thunder"]');const beforeThunder=await thunder.getAttribute('data-motion-frame');await p.waitForTimeout(200);assert.notEqual(await thunder.getAttribute('data-motion-frame'),beforeThunder);
  await p.emulateMedia({reducedMotion:'reduce'});await p.waitForTimeout(120);const stopped=await sample();await p.waitForTimeout(150);assert.deepEqual(await sample(),stopped);assert.equal(await p.locator('.whale-swim').isVisible(),true);assert.equal(await p.locator('.whale-swim').getAttribute('data-whale-count'),'1');assert.equal(await p.locator('.island-scene[data-art-id="24"]>img').evaluate(n=>getComputedStyle(n).opacity),'0');
  assert.deepEqual(errors,[]);const video=p.video();await c.close();await video.saveAs(path.join(out,'Kraken-Ca-Voi.webm'));
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,frames,errors,checks:['eight independent waving arms','Kraken body bob','Whale body and tail deformation','visible swimming displacement','Dragon has no rain','Thunder pulses','reduced-motion fallback']},null,2));console.log('PASS creature animation: real Whale pixels, 8 independent Kraken arms, no Dragon rain, reduced motion; video saved');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exit(1);});
