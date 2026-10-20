'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..');
(async()=>{
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.url==='/sandbox'){res.setHeader('Content-Type','text/html');res.end('<iframe sandbox="allow-scripts allow-downloads" src="/index.html" style="position:fixed;inset:0;width:100%;height:100%;border:0"></iframe>');return;}
  if(req.url==='/index.html'&&process.env.TREASURE_AUDIO_DOCUMENT){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(process.env.TREASURE_AUDIO_DOCUMENT,'utf8').replace('  function render() {','  window.__render=()=>render();\n  function render() {'));return;}
  const file=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html');
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wav':'audio/wav','.png':'image/png'})[path.extname(file)]||'application/octet-stream');
  if(file===path.join(root,'game.js')){res.end(fs.readFileSync(file,'utf8').replace('  function render() {','  window.__render=()=>render();\n  function render() {'));return;}
  fs.createReadStream(file).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[];
 try{
  const page=await browser.newPage({viewport:{width:1368,height:838},reducedMotion:'reduce'});
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
   Math.random=()=>.3;window.__plays=[];window.__media=[];window.__realAudio=window.Audio;
   window.Audio=class {constructor(src){this.src=src;this.paused=true;this.events={};__media.push(this);}play(){this.paused=false;__plays.push(decodeURIComponent(this.src).split('/').pop());return Promise.resolve();}pause(){this.paused=true;}addEventListener(n,fn){this.events[n]=fn;}};
   let engine;Object.defineProperty(window,'TreasureEngine',{get:()=>engine,set:v=>engine={...v,Game:class extends v.Game{constructor(args){super({...args,first:0});window.__game=this;this.actor.gold=10000;}}}});
  });
  await page.goto('http://127.0.0.1:'+server.address().port+'/sandbox');
  const f=page.frames().find(f=>f.parentFrame());
  await f.locator('#picker-sound').click();
  assert.equal(await f.evaluate(()=>__plays.filter(n=>n==='nhạc nền.ogg').length),1);
  await f.locator('#demo-button').click();await f.locator('#port-layer').waitFor({state:'visible'});
  await f.evaluate(()=>__plays.length=0);
  const originalShip=await f.locator('#port-ship').getAttribute('src');
  await f.locator('[data-upgrade="hull"]').click();
  await f.waitForFunction(()=>__plays.includes('nâng cấp.mp3'));
  assert.equal(await f.locator('#port-ship').getAttribute('src'),originalShip);
  assert.equal(await f.evaluate(()=>__game.actor.upgrades.hull),0);
  await f.evaluate(()=>__media.find(a=>decodeURIComponent(a.src).endsWith('nâng cấp.mp3')).events.ended());
  await f.waitForFunction(()=>__game.actor.upgrades.hull===1);
  assert.notEqual(await f.locator('#port-ship').getAttribute('src'),originalShip);
  assert.equal(await f.evaluate(()=>__plays.filter(n=>n==='nâng cấp.mp3').length),1);
  await f.evaluate(()=>{const g=__game;window.__product=g.state.islands.find(i=>i.category==='harvest').product;g.actor.cargo[__product]=3;});
  await f.locator('#merchant-button').click();
  const product=await f.evaluate(()=>__product);await f.locator('[data-sell="'+product+'"]').click();
  assert.equal(await f.evaluate(()=>__plays.filter(n=>n==='mua bán.wav').length),1);
  await f.evaluate(()=>{
   const g=__game,s=g.state,i=s.islands.find(i=>i.category==='harvest'&&i.edible);
   s.phase='MAP';s.turn++;s.distanceLeft=30;s.reward=null;s.productReward=null;
   g.actor.position=i.id;g.actor.transit=null;g.actor.harvestedTurn=-1;i.explored=true;
   g.actor.voyageDays=3;g.actor.provisionCredit=0;g.actor.cargo={};g.actor.dayFood=0;g.actor.hp=70;
   __render();document.querySelector('#islands button[data-id="'+i.id+'"]').click();
  });
  await f.waitForFunction(()=>__plays.includes('mở rương.mp3'));
  assert.equal(await f.locator('#action-layer').isVisible(),false,'harvest result waits for audio');
  await f.evaluate(()=>__media.find(a=>decodeURIComponent(a.src).endsWith('mở rương.mp3')).events.ended());
  await f.locator('.harvest-status').waitFor({state:'visible'});
  assert.match(await f.locator('#action-title').innerText(),/Đã khai thác/);
  assert.deepEqual(await f.evaluate(()=>({team:__game.actor.id,fresh:__game.state.productReward.dailyFood,stored:__game.state.productReward.quantity})),{team:0,fresh:20,stored:30},'red hull Lv1 eats 20 of its 50 fresh food before storing 30');
  for(const [product,edible] of [[28,true],[24,false]]){
   await f.evaluate(id=>{__game.state.productReward.id=id;__game.state.turn++;__render();},product);
   assert.equal(await f.locator('.harvest-edibility').innerText(),edible?'Ăn được · Dùng làm thực phẩm':'Không ăn được · Chỉ cất kho hoặc bán');
   if(process.env.TREASURE_LABEL_QA){
    fs.mkdirSync(process.env.TREASURE_LABEL_QA,{recursive:true});
    await f.locator('.chest-art').evaluate(img=>img.decode());
    await f.locator('#action-card').evaluate(async card=>{
     const urls=[null,'::before','::after'].flatMap(pseudo=>[...getComputedStyle(card,pseudo).backgroundImage.matchAll(/url\(["']?(.*?)["']?\)/g)].map(m=>m[1]));
     await Promise.all(urls.map(url=>{const img=new Image();img.src=url;return img.decode();}));
    });
    await f.locator('#action-card').screenshot({path:path.join(process.env.TREASURE_LABEL_QA,'food-'+product+'.png')});
   }
  }
  // Real renderer and handlers, with controlled engine state to isolate audio events.
  await f.evaluate(()=>{document.getElementById('port-layer').hidden=true;const g=__game;g.state.phase='CHEST';g.state.purpose='dig';Object.assign(g.state.treasure,{owner:g.actor.id,location:g.actor.position,claimedBy:null});__render();});
  await f.locator('#action-buttons button').click();
  assert.equal(await f.evaluate(()=>__plays.filter(n=>n==='mở rương.mp3').length),2);
  for(const correct of [true,false]){
   await f.evaluate(()=>{const s=__game.state;s.phase='QUESTION';s.question={text:'Audio test',options:['A','B','C','D'],answer:0};s.questionIsland=2;s.pendingDestination=2;s.turn++;__render();});
   await f.locator('.answer-option').nth(correct?0:1).click();await f.locator('#submit-answer').click();
   assert.equal(await f.evaluate(name=>__plays.filter(n=>n===name).length,correct?'Trả lời đúng.mp3':'trả lời sai.mp3'),1);
  }
  await f.evaluate(()=>{__game.win(0,'Audio QA');__render();__render();});
  assert.equal(await f.evaluate(()=>__plays.filter(n=>n==='chiến thắng.mp3').length),1);
  assert.equal(await f.evaluate(()=>__media.find(a=>decodeURIComponent(a.src).endsWith('nhạc nền.ogg')).paused),true);
  // Decode every actual supplied file in the sandbox, rather than only checking extension.
  const decoded=await f.evaluate(async()=>{
   const ctx=new AudioContext(),results=[];
   for(const [event,name] of Object.entries(TreasureAudio.files)){
    const musicURL=__media.find(a=>decodeURIComponent(a.src).endsWith('nhạc nền.ogg')).src;
    const response=await fetch(new URL(encodeURIComponent(name),musicURL));
    if(!response.ok)throw Error(name+' HTTP '+response.status);
    const buffer=await ctx.decodeAudioData(await response.arrayBuffer());results.push({event,duration:buffer.duration});
   }await ctx.close();return results;
  });
  assert.equal(decoded.length,11);assert.ok(decoded.every(x=>x.duration>0));
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,sandbox:true,upgradeOnce:true,trade:true,chest:true,answers:true,victoryOnce:true,decoded},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
