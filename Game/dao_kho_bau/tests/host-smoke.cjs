'use strict';
const {chromium}=require('playwright'),http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {execFileSync}=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),out=path.resolve(process.env.TREASURE_QA_OUT||path.join(root,'../../artifacts/treasure-island-variety-20261017/host'));fs.mkdirSync(out,{recursive:true});
const appIndex=fs.readFileSync(path.resolve(root,'../../index.html'),'utf8');
const launchCard=appIndex.match(/<button\b[^>]*data-zeva-game="treasure"[\s\S]*?<\/button>/)?.[0];
assert.ok(launchCard&&!launchCard.includes('--planned'));
assert.equal((appIndex.match(/include\('client_106_treasure_game'\)/g)||[]).length,1);
const words=[['anchor','mỏ neo'],['ocean','đại dương'],['sail','cánh buồm'],['gold','vàng'],['shield','cái khiên'],['rope','dây thừng']];
const lessons=[{lessonKey:'TST-A-20261016',lessonId:'FULL-LESSON-U01-L02',learnedOn:'2026-10-16',startedAt:'18:00'},{lessonKey:'TST-A-20261015',lessonId:'FULL-LESSON-U01-L01',learnedOn:'2026-10-15',startedAt:'18:00'},...Array.from({length:8},(_,i)=>({lessonKey:'TST-A-202610'+(14-i),lessonId:'FULL-LESSON-U01-'+i,learnedOn:'2026-10-'+String(14-i).padStart(2,'0'),startedAt:'18:00'}))];
const classes=[{classCode:'TST-A',className:'Lớp Mới'},{classCode:'TST-B',className:'Lớp <img src=x onerror=alert(1)>'},...Array.from({length:22},(_,i)=>({classCode:'C'+i,className:'Lớp '+(i+1)}))];
const fixture='window.BBG_STATE={session:{token:"test-session-private"}};window.__calls=[];window.__delay=0;window.__mismatch=false;window.__empty=false;window.bbgCall=async function(name,params,options){window.__calls.push({name,params,options});await new Promise(r=>setTimeout(r,window.__delay));if(params.listClasses)return {ok:true,data:{classes:'+JSON.stringify(classes)+'}};if(params.listLessons)return {ok:true,data:{lessons:window.__empty?[]:'+JSON.stringify(lessons)+'}};const lessons='+JSON.stringify(lessons)+';return {ok:true,data:{lesson:window.__mismatch?lessons[0]:lessons.find(l=>l.lessonKey===params.lessonKey),rows:'+JSON.stringify(words.map(([w,m],i)=>[String(i),w,m]))+'}}};';
(async()=>{
 let host='',browser;
 const server=http.createServer((req,res)=>{
  res.setHeader('Access-Control-Allow-Origin','*');
  if(req.url==='/host'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html><body><div id="gamesCardList">'+launchCard+'</div><script>'+fixture+'</script>'+host+'</body></html>');return;}
  const full=path.resolve(root,decodeURIComponent((req.url||'').split('?')[0]).replace(/^\/game\/dao-kho-bau\//,''));
  if(!full.startsWith(root+path.sep)||!fs.existsSync(full)||!fs.statSync(full).isFile()){res.writeHead(404);res.end();return;}
  const types={'.png':'image/png','.css':'text/css','.js':'application/javascript','.ttf':'font/ttf','.html':'text/html'};
  res.setHeader('Content-Type',types[path.extname(full)]||'application/octet-stream');fs.createReadStream(full).pipe(res);
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
 try{
  if(process.env.TREASURE_PRODUCTION==='1')host=fs.readFileSync(process.env.TREASURE_HOST_FILE||path.resolve(root,'../../client_106_treasure_game.html'),'utf8');
  else{execFileSync(process.execPath,[path.join(root,'build-host.cjs'),'--asset-base',origin+'/game/dao-kho-bau/'],{stdio:'pipe'});host=fs.readFileSync(path.join(root,'dist/client_treasure_game.html'),'utf8');}
  browser=await chromium.launch({headless:true,...(process.env.ZEVA_BROWSER_CHANNEL?{channel:process.env.ZEVA_BROWSER_CHANNEL}:{})});
  const page=await browser.newPage({viewport:{width:1368,height:838},reducedMotion:'reduce'}),errors=[],checks=[],assetRequests=[];page.on('pageerror',e=>errors.push(e.message));
  let holdArtwork=true,failArtwork=false,releaseArtwork;
  const artworkGate=new Promise(resolve=>releaseArtwork=resolve);
  await page.route('**/assets/**',async route=>{
    const filename=new URL(route.request().url()).pathname.split('/assets/')[1];assetRequests.push(filename);
    if(filename==='island-01-volcano.png'){
      if(holdArtwork)await artworkGate;
      if(failArtwork)return route.abort();
    }
    await route.fulfill({path:path.join(root,'assets',filename),headers:{'Access-Control-Allow-Origin':'*'}});
  });
  await page.goto(origin+'/host');await page.getByRole('button',{name:'Đảo dấu vàng',exact:true}).focus();await page.keyboard.press('Enter');
  const f=page.frameLocator('#ztbFrame');await f.locator('#class-list button').first().waitFor();await f.locator('body').evaluate(()=>document.fonts.ready);
  async function assertPickerOnly(){
    assert.equal(await f.locator('#island-scenes .island-scene,#islands button,#routes path').count(),0,'islands and route controls are not built before entering a match');
    assert.equal(await f.locator('#map-footer').isVisible(),false);assert.equal(await f.locator('#map-viewport').isVisible(),false);
    assert.equal(await f.locator('#map-viewport').evaluate(n=>n.inert),true);
  }
  await assertPickerOnly();assert.equal(await f.locator('#game-loading').isVisible(),false);
  assert.equal(await f.locator('#class-list button').count(),24);assert.equal(await f.locator('#class-list img').count(),0);
  assert.equal(await f.locator('.launch,#fullscreen-button,.fixed-teams,.first-label,.setup-rules').count(),0);assert.equal(await f.locator('#class-status').isVisible(),false);assert.equal(await f.locator('#demo-button').isVisible(),false);
  assert.equal(await f.locator('#class-list').evaluate(n=>getComputedStyle(n).scrollbarWidth),'none');await f.locator('#class-list').evaluate(n=>n.scrollTop=200);assert.ok(await f.locator('#class-list').evaluate(n=>n.scrollTop)>0);await f.locator('#class-list').evaluate(n=>n.scrollTop=0);
  for(const [width,height] of [[1368,838],[1280,720],[1024,768],[1920,1080],[844,390],[390,844],[1368,838]]){
   await page.setViewportSize({width,height});await f.locator('#stage').evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   const m=await f.locator('#stage').evaluate(n=>({w:innerWidth,h:innerHeight,r:n.getBoundingClientRect().toJSON()}));assert.ok(m.r.left>=-1&&m.r.top>=-1&&m.r.right<=m.w+1&&m.r.bottom<=m.h+1);assert.ok(Math.abs(m.r.left-(m.w-m.r.width)/2)<1&&Math.abs(m.r.top-(m.h-m.r.height)/2)<1);checks.push(m);
  }
  await f.locator('#picker-sound').click();assert.equal(await f.locator('#picker-sound').getAttribute('aria-pressed'),'true');await f.locator('#picker-sound').click();
  const toolbar=await f.locator('.picker-heading').evaluate(n=>[...n.children].map(el=>({x:el.getBoundingClientRect().x+el.getBoundingClientRect().width/2,y:el.getBoundingClientRect().y,h:el.getBoundingClientRect().height})));
  assert.ok(toolbar[0].x<toolbar[1].x&&toolbar[1].x<toolbar[2].x);assert.ok(Math.abs(toolbar[0].y+toolbar[0].h/2-toolbar[2].y-toolbar[2].h/2)<1);
  async function checkPicker(){
   const layout=await f.locator('#class-list').evaluate(n=>{const r=n.getBoundingClientRect(),buttons=[...n.children].map(b=>b.getBoundingClientRect());return {visible:buttons.filter(b=>b.top>=r.top-.1&&b.bottom<=r.bottom+.1).length,partial:buttons.filter(b=>b.top<r.bottom-.1&&b.bottom>r.bottom+.1).length,height:r.height,buttonHeight:buttons[0].height,buttonWidth:buttons[0].width};});
   assert.equal(layout.visible,6);assert.equal(layout.partial,0);assert.ok(layout.buttonHeight>65&&layout.buttonWidth<250);
   return layout;
  }
  checks.push(await checkPicker());assert.equal(await f.locator('#class-back').count(),0);assert.equal(await f.locator('#exit-button').getAttribute('aria-label'),'Trở về ZEVA');
  const full=await f.locator('#stage').boundingBox();assert.ok(Math.abs(full.height-838)<1&&Math.abs(full.y)<1);
  await page.screenshot({path:path.join(out,'01-classes-1368x838.png')});
  await f.locator('#class-search').fill('lop moi');assert.equal(await f.locator('#class-list button').count(),1);await f.locator('#class-list button').click();await f.locator('[data-lesson-key]').first().waitFor();assert.equal(await f.locator('[data-lesson-key]').count(),10);assert.equal(await f.locator('#setup').isVisible(),true);
  checks.push(await checkPicker());assert.equal(await f.locator('#exit-button').getAttribute('aria-label'),'Quay lại chọn lớp');
  await assertPickerOnly();assert.equal(await f.locator('#game-loading').isVisible(),false);
  assert.deepEqual(assetRequests.filter(name=>/^(island-|base-|ship-|harbor-|result-|ui-tools|ui-action-green|ui-team|ui-challenge)/.test(name)),[],'picker does not fetch gameplay artwork');
  await page.screenshot({path:path.join(out,'02-lessons-1368x838.png')});await f.locator('#exit-button').click();assert.equal(await f.locator('[data-class-code]').count(),24);
  await page.evaluate(()=>window.__delay=1000);await f.locator('[data-class-code="TST-A"]').click();
  await f.locator('#game-loading').waitFor({state:'visible'});assert.equal(await f.locator('#game-progress').getAttribute('value'),null);await assertPickerOnly();
  await page.screenshot({path:path.join(out,'02a-class-loading.png')});
  await f.locator('#exit-button').click();await page.waitForTimeout(1100);assert.equal(await f.locator('[data-class-code]').count(),24);assert.equal(await f.locator('#exit-button').getAttribute('aria-label'),'Trở về ZEVA');assert.equal(await f.locator('#game-loading').isVisible(),false);await page.evaluate(()=>window.__delay=0);
  await page.evaluate(()=>window.__empty=true);await f.locator('[data-class-code="TST-A"]').click();await f.locator('#class-status').filter({hasText:'chưa có buổi học'}).waitFor();assert.equal(await f.locator('[data-lesson-key]').count(),0);
  await page.evaluate(()=>window.__empty=false);await f.locator('#exit-button').click();await f.locator('[data-class-code="TST-A"]').click();await f.locator('[data-lesson-key]').first().waitFor();
  const boot=await f.locator('body').evaluate(()=>window.TREASURE_BOOTSTRAP);assert.equal(JSON.stringify(boot).includes('test-session-private'),false);const count=await page.evaluate(()=>window.__calls.length);
  await f.locator('body').evaluate(()=>parent.postMessage({type:'zeva-treasure-read',channel:TREASURE_BOOTSTRAP.channel,id:'unlisted',action:'lesson',classCode:'TST-A',lessonKey:'UNLISTED'},'*'));
  await page.evaluate(b=>window.postMessage({type:'zeva-treasure-read',channel:b.channel,id:'spoof',action:'lesson',classCode:'TST-A',lessonKey:'TST-A-20261015'},location.origin),boot);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>window.__calls.length),count);
  await page.evaluate(()=>window.__mismatch=true);await f.locator('[data-lesson-key="TST-A-20261015"]').click();await f.locator('#class-status').filter({hasText:'đã thay đổi'}).waitFor();assert.equal(await f.locator('#setup').isVisible(),true);
  await page.evaluate(()=>window.__mismatch=false);await f.locator('[data-lesson-key="TST-A-20261015"]').click();await f.locator('#game-loading').waitFor({state:'visible'});
  await f.locator('#game-progress').evaluate(n=>new Promise(resolve=>{const check=()=>n.value>5?resolve():requestAnimationFrame(check);check();}));
  await assertPickerOnly();assert.ok(await f.locator('#game-progress').evaluate(n=>n.value<100));
  await page.screenshot({path:path.join(out,'02b-artwork-loading.png')});
  await f.locator('#exit-button').click();holdArtwork=false;failArtwork=true;releaseArtwork();
  await page.waitForTimeout(300);await assertPickerOnly();assert.equal(await f.locator('#game-loading').isVisible(),false);
  await f.locator('[data-class-code="TST-A"]').click();await f.locator('[data-lesson-key]').first().waitFor();
  failArtwork=true;await f.locator('[data-lesson-key="TST-A-20261015"]').click();await f.locator('#class-status').filter({hasText:'Chưa tải đủ ảnh'}).waitFor();
  await assertPickerOnly();assert.equal(await f.locator('#game-loading').isVisible(),false);
  failArtwork=false;await f.locator('[data-lesson-key="TST-A-20261015"]').click();await f.locator('#setup').waitFor({state:'hidden'});assert.match(await f.locator('#bank-label').textContent(),/FULL-LESSON-U01-L01/);assert.equal(await f.locator('#island-scenes .island-scene').count(),24);
  await page.waitForTimeout(300);await page.screenshot({path:path.join(out,'03-map-1368x838.png')});
  await f.locator('#port-depart').click();
  await f.locator('#port-depart').click();
  assert.equal(await f.locator('.turn-compass').count(),0);
  assert.match(await f.locator('html').evaluate(n=>n.style.getPropertyValue('--turn-red-filter')),/about:srcdoc#turn-red-paint/,'embedded paint must resolve inside the document despite its remote asset base');
  await f.locator('.map-prompt').screenshot({path:path.join(out,'03b-turn-button.png')});
  const actualTeam=await f.locator('.map-prompt').getAttribute('data-team'),actualLabel=await f.locator('#status').innerText();
  for(const team of [0,1]){
    await f.locator('.map-prompt').evaluate((n,team)=>{n.dataset.team=String(team);n.querySelector('#status').textContent='Lượt Đội '+(team?'Xanh':'Đỏ');},team);
    const png=await f.locator('.map-prompt').screenshot({path:path.join(out,'03b-turn-'+(team?'blue':'red')+'.png')});
    const paint=await page.evaluate(async data=>{const img=new Image();img.src='data:image/png;base64,'+data;await img.decode();const c=document.createElement('canvas');c.width=img.width;c.height=img.height;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);const pixels=ctx.getImageData(0,0,c.width,c.height).data;let red=0,green=0;for(let y=38;y<c.height-38;y++)for(let x=40;x<c.width-40;x++){const k=(y*c.width+x)*4;if(pixels[k]>pixels[k+1]+40)red++;if(pixels[k+1]>pixels[k]+40)green++;}return{red,green};},png.toString('base64'));
    assert.ok((team?paint.green:paint.red)>1000,'the embedded team button must render its real paint color');
  }
  await f.locator('.map-prompt').evaluate((n,{team,label})=>{n.dataset.team=team;n.querySelector('#status').textContent=label;},{team:actualTeam,label:actualLabel});
  assert.equal(await f.locator('.hud-gold-icon[data-icon="gold"]').count(),2);
  assert.equal(await f.locator('.team-panel [role="progressbar"]').count(),4);
  assert.equal(await f.locator('.team-panel .ship-stat').count(),10);
  assert.equal(await f.locator('.hud-heart').count(),10);
  assert.equal(await f.locator('.food-paper img[data-icon="provisions"]').count(),2);
  assert.equal(await f.locator('.meter-track,.score-paper').count(),0);
  assert.deepEqual(await f.locator('.food-meter').evaluateAll(ns=>ns.map(n=>n.getAttribute('aria-valuenow'))),['3','3']);
  await page.screenshot({path:path.join(out,'03a-new-hud-1368x838.png')});
  const destination=await f.locator('.island.available:not([data-id="1"]):not([data-id="24"])').first().getAttribute('data-id');
  const beforeShips=await f.locator('#ship-0,#ship-1').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('style')));
  await f.locator('.island[data-id="'+destination+'"]').click();await f.locator('#action-layer').waitFor({state:'visible'});
  assert.deepEqual(await f.locator('#ship-0,#ship-1').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('style'))),beforeShips);
  await f.locator('.answer-option').first().waitFor();const question=await f.locator('.question-text').innerText();assert.ok(words.some(([word])=>question.includes('“'+word+'”')));await page.screenshot({path:path.join(out,'04-question-1368x838.png')});

  const calls=await page.evaluate(()=>window.__calls);assert.ok(calls.some(c=>c.params.listLessons&&c.params.classCode==='TST-A'));assert.equal(calls.at(-1).params.lessonKey,'TST-A-20261015');for(const c of calls){assert.equal(c.name,'getBbgVocabularySample');assert.equal(c.params.gameMode,'naval');assert.equal(c.params.token,'test-session-private');assert.equal(c.options.priority,'interactive');}
  await f.locator('#replay').evaluate(n=>n.click());await f.locator('[data-class-code]').first().waitFor();await assertPickerOnly();assert.equal(await f.locator('#game-loading').isVisible(),false);
  await page.evaluate(()=>window.BBG_STATE.session.token='changed');await page.waitForFunction(()=>!document.querySelector('#ztbDialog').open);assert.equal(await page.locator('#ztbFrame').getAttribute('srcdoc'),null);
  await page.click('[data-zeva-game="treasure"]');await f.locator('#exit-button').waitFor();await f.locator('#exit-button').click();await page.waitForFunction(()=>!document.querySelector('#ztbDialog').open);
  const previousCalls=await page.evaluate(()=>window.__calls.length);await page.evaluate(()=>window.__delay=400);await page.click('[data-zeva-game="treasure"]');await page.waitForFunction(n=>window.__calls.length>n,previousCalls);await page.evaluate(()=>window.BBG_STATE.session.token='');await page.waitForFunction(()=>!document.querySelector('#ztbDialog').open);await page.waitForTimeout(500);assert.equal(await page.locator('#ztbFrame').getAttribute('srcdoc'),null);
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({passed:true,defaultViewport:[1368,838],production:process.env.TREASURE_PRODUCTION==='1',checks,assetRequests,errors},null,2));console.log('PASS Treasure host: lightweight picker, class/lesson loading, deferred artwork, cancellation, failed-image retry, replay, selected lesson identity and session lifecycle.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;});
