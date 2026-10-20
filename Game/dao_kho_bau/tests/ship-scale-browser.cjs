'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../artifacts/treasure-ship-scale-20261020/browser');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png','.ttf':'font/ttf'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'}),errors=[],checks=[];
 try{
 const page=await browser.newPage({viewport:{width:1368,height:838},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{Math.random=()=>.3;let engine,ui;Object.defineProperty(window,'TreasureEngine',{get:()=>engine,set:v=>engine={...v,Game:class extends v.Game{constructor(args){super(args);window.__game=this;}}}});Object.defineProperty(window,'TreasureShipyardUI',{get:()=>ui,set:v=>ui={...v,create:options=>(window.__port=v.create(options))}});});
 await page.goto('http://127.0.0.1:'+server.address().port);await page.locator('#demo-button').click();await page.locator('#port-layer').waitFor({state:'visible'});
 for(const [width,height] of [[1368,838],[1920,1080],[844,390]]){
  await page.setViewportSize({width,height});
  for(const team of [0,1]){
   const variants=await page.evaluate(()=>TreasureShipyard.variants.map(v=>({...v})));let priorHull=0;
   for(let hull=0;hull<=3;hull++){
    let scale=null;
    for(const v of variants.filter(v=>v.team===team&&v.hull===hull)){
     const result=await page.evaluate(async v=>{const g=__game;g.state.active=v.team;g.state.phase='PORT';g.actor.position=v.team?1:24;Object.assign(g.actor.upgrades,{hull:v.hull,cannon:v.cannon,sail:v.sail});__port.render(g,false,false);const back=document.getElementById('port-backdrop'),ship=document.getElementById('port-ship');await back.decode();await ship.decode();dispatchEvent(new Event('resize'));await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));return{scale:Number(ship.style.scale),width:ship.getBoundingClientRect().width,source:ship.getAttribute('src')};},v);
     assert.ok(result.scale>0);if(scale!==null)assert.ok(Math.abs(result.scale-scale)<1e-9,'sail/cannon must not shrink hull');else scale=result.scale;
     checks.push({width,height,...v,...result});
     if(width===1368&&team===0&&v.cannon===0&&[[1,0],[1,1],[2,1]].some(([h,s])=>v.hull===h&&v.sail===s))await page.screenshot({path:path.join(out,`h${v.hull}-s${v.sail}.png`)});
    }
    assert.ok(scale>priorHull,'every hull upgrade must grow');priorHull=scale;
   }
  }
 }
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,variants:60,viewports:3,checks,errors},null,2));console.log('PASS: 60 ship variants across 3 viewports; sail/cannon preserve size, every hull upgrade grows.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
