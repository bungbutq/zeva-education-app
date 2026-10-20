'use strict';
const {chromium}=require('playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const root=path.resolve(__dirname,'..'),out=path.resolve(root,'../../artifacts/treasure-single-whale-20261020/visual');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const server=http.createServer((req,res)=>{const file=path.resolve(root,decodeURIComponent(req.url.split('?')[0]).slice(1)||'index.html');if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.png':'image/png'})[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const browser=await chromium.launch({headless:true,channel:'msedge'});
 try{
  const page=await browser.newPage({viewport:{width:1368,height:838},reducedMotion:'no-preference'}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:'+server.address().port+'/index.html');await page.locator('#demo-button').click();await page.locator('#port-layer').waitFor({state:'visible'});await page.locator('#port-depart').click();
  // Put the actual scene in a fixed preview so camera randomization cannot hide it.
  await page.evaluate(()=>{const scene=document.createElement('div');scene.className='island-scene';scene.dataset.artId='24';scene.innerHTML='<img src="assets/island-24-whale.png" alt="Cá voi">'+TreasureArtwork.effects('whale');const preview=document.createElement('div');preview.id='whale-preview';preview.style.cssText='position:fixed;inset:0;z-index:99999;background:#076ca1;display:grid;place-items:center';document.body.append(preview);preview.append(scene);scene.style.cssText='position:relative;left:auto;top:auto;transform:none;width:700px;height:416px;';TreasureEffects.bindIslands(preview);});
  await page.waitForFunction(()=>document.querySelector('#whale-preview .whale-swim').dataset.whaleCount==='1');
  const sample=()=>page.locator('#whale-preview .whale-swim').evaluate(c=>{const data=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let hash=2166136261,visible=0;for(let i=0;i<data.length;i+=4){hash=Math.imul(hash^data[i]^data[i+1]^data[i+2]^data[i+3],16777619)>>>0;if(data[i+3])visible++;}return {hash,visible,count:c.dataset.whaleCount};});
  const frames=[];for(let i=0;i<3;i++){await page.waitForTimeout(450);frames.push(await sample());await page.locator('#whale-preview').screenshot({path:path.join(out,'single-whale-'+i+'.png')});}
  assert.equal(new Set(frames.map(x=>x.hash)).size,3);assert.ok(frames.every(x=>x.count==='1'&&x.visible>1000));
  await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);const still=await sample();await page.waitForTimeout(150);assert.deepEqual(await sample(),still);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'whale-report.json'),JSON.stringify({passed:true,frames,reducedMotion:true,errors},null,2));console.log('PASS single whale: visible body/tail motion, one whale, reduced-motion still frame');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
