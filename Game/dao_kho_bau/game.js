(function () {
  'use strict';
  const E = window.TreasureEngine, YARD=window.TreasureShipyard, TRADE=window.TreasureTrade, TRADE_UI=window.TreasureTradeUI, $ = id => document.getElementById(id);
  // The embedded build has a remote <base>; keep the paint filter in this document.
  document.documentElement.style.setProperty('--turn-red-filter','url('+JSON.stringify(location.href.split('#')[0]+'#turn-red-paint')+')');
  const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  
  let game = null, bank = null, busy = false, launching = false, mapPreview = false, mapReturnLabel = '';
  const sounds=window.TreasureAudio.create();
  let victoryGame=null,lastBattle=null;
  const shipSrc=t=>'assets/'+YARD.filename(t.id,t.upgrades);
  let upgrading=false,islandBattleAbort=null;
  const portUI=window.TreasureShipyardUI.create({onUpgrade:async kind=>{
    if(busy||upgrading||!game?.upgradeStatus(kind).ok)return;
    const currentGame=game,team=game.actor,next={...team.upgrades,[kind]:team.upgrades[kind]+1};upgrading=true;
    for(const b of $('port-layer').querySelectorAll('button'))b.disabled=true;
    $('merchant-button').disabled=true;$('port-depart').disabled=true;
    $('port-notice').textContent='Đang chuẩn bị tàu mới…';$('port-notice').hidden=false;
    const picture=new Image();picture.src='assets/'+YARD.filename(team.id,next);
    try{
      await picture.decode();
      if(game===currentGame&&game.actor===team&&game.upgradeStatus(kind).ok){
        $('port-notice').textContent='Đang nâng cấp tàu…';
        await sounds.play('upgrade',{wait:true});
        if(game===currentGame&&game.actor===team&&game.upgrade(kind))render();
      }
    }
    catch{if(game===currentGame){game.state.notice='Chưa tải được ảnh tàu. Vàng được giữ nguyên; hãy thử lại.';render();}}
    finally{upgrading=false;$('port-depart').disabled=false;$('merchant-button').disabled=false;}
  },onDepart:()=>{if(!busy&&!upgrading&&game?.leavePort())render();},onSell:(id,quantity)=>{if(!busy&&!upgrading&&game?.sellProduct(id,quantity)){sounds.play('trade');render();return true;}return false;}});
  const sourceBridge=window.TreasureSource.createBridge(window);
  let classRows=[], lessonRows=[], selectedClass=null, pickerView='classes', classLoading=false, classGeneration=0;
  let sound = false, lastActionKey = '', focusBeforeInfo = null;
  let viewResult = true, launchFirst = 0;
  const paths = new Map(), nodes = new Map(), scenes = new Map();
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const camera=window.TreasureMapCamera.create({viewport:$('map-viewport'),reduced,canPan:()=>!!game&&!busy&&$('port-layer').hidden&&$('action-layer').hidden&&$('info-layer').hidden&&$('result').hidden});
  function readyBank(questions,label){
    bank=E.validateQuestions(questions);$('bank-label').textContent=label;
  }
  const lessonDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)?value.split('-').reverse().join('/'):value;
  function pickerStatus(text){$('class-status').textContent=text;$('class-status').hidden=!text;}
  function loadingScreen(active,lessons=false){
    $('setup-form').classList.toggle('loading',active);$('game-loading').hidden=!active;
    if(active){
      $('loading-title').textContent=lessons?'Đang tải buổi học…':'Đang chuẩn bị hải trình…';
      $('loading-status').textContent=lessons?'Đang lấy 10 buổi học gần nhất của lớp…':'Đang chuẩn bị từ vựng của buổi học…';
      if(lessons)$('game-progress').removeAttribute('value');else $('game-progress').value=0;
    }
  }
  function pickerScreen(view){
    pickerView=view;const isClass=view==='classes';
    const nav=$('exit-button');nav.setAttribute('aria-label',isClass?'Trở về ZEVA':'Quay lại chọn lớp');nav.title=nav.getAttribute('aria-label');
    nav.querySelector('.home-symbol').style.display=isClass?'':'none';nav.querySelector('.back-symbol').style.display=isClass?'none':'';
    $('picker-title').innerHTML=isClass?'Chọn lớp, <em>ra khơi!</em>':'Chọn <em>buổi học</em>';
    $('lesson-context').hidden=isClass;$('selected-class').textContent=isClass?'':selectedClass.className||selectedClass.classCode;
    $('class-search').value='';$('class-search').disabled=classLoading;
    $('class-search').placeholder=isClass?'Tìm tên hoặc mã lớp…':'Tìm ngày hoặc mã buổi học…';
    $('class-search').setAttribute('aria-label',isClass?'Tìm lớp học':'Tìm buổi học');
    $('class-list').setAttribute('aria-label',isClass?'Danh sách lớp':'Danh sách buổi học');
    $('class-list').replaceChildren();$('class-list').scrollTop=0;$('class-retry').hidden=true;
  }
  function renderClasses(){
    const norm=v=>String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/gi,'d').toLowerCase();
    const query=norm($('class-search').value);$('class-list').replaceChildren();
    const isClass=pickerView==='classes';
    (isClass?classRows:lessonRows).forEach(item=>{
      const label=isClass?(item.className||item.classCode):'Buổi học '+lessonDate(item.learnedOn);
      const detail=isClass?item.classCode:[item.startedAt,item.lessonId].filter(Boolean).join(' · ');
      if(!norm(label+' '+detail).includes(query))return;
      const b=document.createElement('button'),name=document.createElement('span'),code=document.createElement('small');
      b.type='button';b.disabled=classLoading||launching;name.textContent=label;code.textContent=detail;b.append(name,code);
      if(isClass){b.dataset.classCode=item.classCode;b.addEventListener('click',()=>chooseClass(item));}
      else{b.dataset.lessonKey=item.lessonKey;b.addEventListener('click',()=>chooseLesson(item));}
      $('class-list').append(b);
    });
    if(!classLoading&&!launching)pickerStatus($('class-list').childElementCount?'':isClass?'Không có lớp phù hợp.':lessonRows.length?'Không có buổi học phù hợp.':'Lớp chưa có buổi học được ghi nhận. Hãy chọn lớp khác.');
  }
  async function loadClasses(){
    const generation=++classGeneration;bank=null;classRows=[];lessonRows=[];selectedClass=null;classLoading=true;
    pickerScreen('classes');$('bank-label').textContent='Chưa chọn buổi học';$('demo-button').hidden=!!sourceBridge;
    document.querySelector('.question-source').hidden=!!sourceBridge;
    if(!sourceBridge){
      classLoading=false;pickerStatus('Mở trò chơi từ ZEVA để chọn lớp và buổi học. Bản xem thử dùng bộ câu hỏi mẫu.');
      $('class-search').hidden=true;return;
    }
    pickerStatus('Đang tải danh sách lớp…');
    try{
      const data=await sourceBridge.read('classes');if(generation!==classGeneration)return;
      classRows=(Array.isArray(data.classes)?data.classes:[]).filter(c=>typeof c.classCode==='string'&&c.classCode);
      classLoading=false;$('class-search').disabled=false;renderClasses();
      $('class-retry').hidden=classRows.length>0;
    }catch(error){if(generation===classGeneration){classLoading=false;pickerStatus(error.message);$('class-retry').hidden=false;}}
  }
  async function chooseClass(selected){
    if(classLoading||launching||!sourceBridge||!classRows.some(c=>c.classCode===selected.classCode))return;
    const generation=++classGeneration;classLoading=true;bank=null;selectedClass=selected;lessonRows=[];
    pickerScreen('lessons');loadingScreen(true,true);
    try{
      const data=await sourceBridge.read('lessons',selected.classCode);if(generation!==classGeneration)return;
      if(!Array.isArray(data.lessons))throw Error('Chưa tải được danh sách buổi học. Hãy thử lại.');
      lessonRows=data.lessons;classLoading=false;$('class-search').disabled=false;renderClasses();
    }catch(error){if(generation===classGeneration){classLoading=false;pickerStatus(error.message);$('class-retry').hidden=false;}}
    finally{if(generation===classGeneration)loadingScreen(false);}
  }
  async function chooseLesson(selectedLesson){
    if(classLoading||launching||!selectedClass||!lessonRows.some(item=>item.lessonKey===selectedLesson.lessonKey))return;
    const generation=++classGeneration;classLoading=true;bank=null;renderClasses();$('class-search').disabled=true;
    loadingScreen(true);
    try{
      const data=await sourceBridge.read('lesson',selectedClass.classCode,selectedLesson.lessonKey);if(generation!==classGeneration)return;
      if(data.lessonKey!==selectedLesson.lessonKey||data.lessonId!==selectedLesson.lessonId)throw Error('Buổi học đã thay đổi. Hãy chọn lại lớp và buổi học.');
      readyBank(window.TreasureSource.fromWords(data.words),data.label);classLoading=false;await start();
    }catch(error){if(generation===classGeneration){bank=null;classLoading=false;loadingScreen(false);renderClasses();pickerStatus(error.message);}}
    finally{if(generation===classGeneration){classLoading=false;$('class-search').disabled=false;}}
  }
  $('class-search').addEventListener('input',renderClasses);
  $('class-retry').addEventListener('click',()=>selectedClass?chooseClass(selectedClass):loadClasses());
  function backToClasses(){
    classGeneration++;bank=null;classLoading=false;launching=false;loadingScreen(false);selectedClass=null;lessonRows=[];pickerScreen('classes');renderClasses();$('class-search').focus();
  }
  $('demo-button').addEventListener('click',async()=>{try{readyBank(window.TreasureQuestions,'Bản chơi thử · 32 câu hỏi mẫu');await start();}catch(error){pickerStatus(error.message);}});
  function fit() {
    const scale=Math.min(innerWidth/1600,innerHeight/900),height=innerHeight/scale;
    $('stage').style.height=height+'px';$('stage').style.setProperty('--map-offset-y',(height-900)/2+'px');
    // Layout zoom rerasterizes artwork at the displayed size. Scaling a composed
    // stage magnifies the small-window image layers after maximizing the window.
    $('stage').style.zoom=String(scale);$('stage').style.transform='none';
    fitChallengeIsland();
  }
  addEventListener('resize',fit); fit();
  function tone(kind) { sounds.play(kind==='bad'?'incorrect':kind==='win'?'victory':'correct'); }
  let mapIslands=[],mapLayout=null,lastMapActor='';
  function node(id) { return mapIslands[id-1]; }
  function islandDescription(artId){
    const scenery={
      1:'Ngọn núi lửa đỏ rực nổi bật giữa đại dương.',
      2:'Mỏm đá hình đầu lâu canh giữ hòn đảo bí ẩn.',
      3:'Ngọn hải đăng dẫn lối cho những chuyến tàu xa.',
      4:'Những phế tích cổ nằm giữa cây xanh trên đảo.',
      5:'Dòng thác trắng xóa đổ xuống giữa rừng nhiệt đới.',
      6:'Ngôi làng nhỏ nép bên bến cảng yên bình.',
      7:'Một chú cua khổng lồ đang nghỉ bên vịnh biển.',
      8:'Xác con tàu cũ nằm lại bên bờ đảo.',
      9:'Tháp canh vươn cao nhìn ra biển xanh.',
      10:'Những pho tượng đá đứng lặng giữa cây xanh.',
      11:'Cửa hang bí mật ẩn mình trong vách đá.',
      12:'Những khối pha lê lấp lánh trong nắng biển.',
      13:'Chú rùa khổng lồ mang cả hòn đảo trên lưng.',
      14:'Pháo đài vững chãi nhìn ra đại dương.',
      15:'Rễ cây đan vào nhau giữa làn nước xanh.',
      16:'Những cây nấm khổng lồ phủ bóng trên đảo.',
      17:'Vịnh biển xanh là nơi các nàng tiên cá vui đùa.',
      18:'Mỏm đá hình rồng vươn lên giữa sóng biển.',
      19:'Những tia chớp sáng lóe trên hòn đảo.',
      20:'Cánh cối xay đón gió biển trên đỉnh đảo.',
      21:'Thanh kiếm khổng lồ nổi bật giữa hòn đảo.',
      22:'Những dấu tích cổ xưa nằm trên bãi đá.',
      25:'Làn sương mỏng phủ quanh hòn đảo bí ẩn.',
      26:'Mây đen và sóng lớn bao quanh vùng biển.',
      27:'Dải cát vàng uốn lượn giữa làn nước trong.',
      28:'Những tảng băng trắng trôi trên mặt biển.',
      29:'Những mỏm đá nhô lên giữa sóng nước.',
      30:'Tuyết trắng phủ trên ngọn núi giữa biển.',
      31:'Cây trái sum suê phủ xanh hòn đảo.',
      32:'Những tán anh đào hồng rực đung đưa trong gió.',
      33:'Những mái nhà nhỏ nằm giữa cây xanh trên đảo.',
      34:'Những chú rắn ẩn mình giữa cây lá.',
      35:'Những chiếc vây cá mập lướt trên mặt nước.',
      36:'Những rạn san hô đầy màu sắc nằm dưới làn nước trong xanh.'
    };
    return (scenery[artId]||'Một hòn đảo đang chờ bạn khám phá.')+' Hãy vượt qua thử thách tiếng Anh để khám phá kho báu trên đảo nhé!';
  }
  // Every visible dotted route is sourced from EDGES, the same graph as engine.canMove().
  function buildMap() {
    mapLayout=window.TreasureMapLayout.create();const order=window.TreasureArtwork.shuffledIslands(Math.random,mapLayout.islands.length,window.TreasureIslandRules.bossPosition(mapLayout),mapLayout.edges);camera.reset();lastMapActor='';
    mapIslands=mapLayout.islands.map((slot,index)=>{const theme=window.TreasureIslandRules.theme(order[index].id);return {...slot,name:order[index].name,art:order[index],themeId:theme.id,category:theme.category,rarity:theme.rarity??null,kind:theme.category==='boss'?'kraken':'island'};});
    mapLayout={...mapLayout,islands:mapIslands};
    for(const id of ['routes','islands','island-scenes'])$(id).replaceChildren();paths.clear();nodes.clear();scenes.clear();
    // Hide route dots beneath the illustrated land, while retaining one full
    // continuous path for ship movement and graph highlighting.
    const ns='http://www.w3.org/2000/svg', defs=document.createElementNS(ns,'defs');
    const mask=document.createElementNS(ns,'mask'); mask.id='water-routes';
    const base=document.createElementNS(ns,'rect');
    for(const [key,value] of Object.entries({x:0,y:0,width:mapLayout.width,height:900,fill:'white'}))base.setAttribute(key,value);
    mask.append(base);
    for(const p of mapIslands){
      const land=document.createElementNS(ns,'rect'),footprint=window.TreasureMapLayout.FOOTPRINT;
      for(const [key,value] of Object.entries({x:p.x-footprint.width/2,y:p.y+footprint.top,width:footprint.width,height:footprint.height,fill:'black'}))land.setAttribute(key,value);
      mask.append(land);
    }
    defs.append(mask);$('routes').append(defs);
    const routeLayer=document.createElementNS(ns,'g');routeLayer.setAttribute('mask','url(#water-routes)');$('routes').append(routeLayer);
    for (const [a,b] of mapLayout.edges) {
      const route=mapLayout.routes.find(route=>route.a===a&&route.b===b);
      const path=document.createElementNS('http://www.w3.org/2000/svg','path');
      path.setAttribute('d',route.d); path.setAttribute('class','route'); path.dataset.a=a; path.dataset.b=b;
      routeLayer.append(path); paths.set(a+'-'+b,path);
      // A rectangular land mask used to slice boundary dots into crescents.
      // Remove the entire dot (including its widest active stroke) instead.
      const footprint=window.TreasureMapLayout.FOOTPRINT,length=path.getTotalLength();
      for(let d=.5;d<=length;d+=17){
        const dot=path.getPointAtLength(d),x=(dot.x%mapLayout.width+mapLayout.width)%mapLayout.width;
        if(!mapIslands.some(p=>Math.min(Math.abs(x-p.x),mapLayout.width-Math.abs(x-p.x))<=footprint.width/2+9&&dot.y>=p.y+footprint.top-9&&dot.y<=p.y+footprint.bottom+9))continue;
        for(const offset of route.wrapped?[0,mapLayout.width]:[0]){
          const cover=document.createElementNS(ns,'circle');cover.setAttribute('cx',dot.x+offset);cover.setAttribute('cy',dot.y);cover.setAttribute('r',9);cover.setAttribute('fill','black');mask.append(cover);
        }
      }
      if(route.wrapped){const other=path.cloneNode(true);other.setAttribute('transform','translate('+mapLayout.width+' 0)');routeLayer.append(other);}
    }
    for (const island of mapIslands) {
      const art=island.art,scene=document.createElement('div');
      const artScale=Math.min(1,156/art.height,232/art.width);
      scene.className='island-scene';scene.dataset.id=island.id;scene.dataset.artId=art.id;scene.style.left=island.x+'px';scene.style.top=(island.y+12)+'px';scene.style.width=art.width*artScale+'px';scene.style.height=art.height*artScale+'px';
      scene.innerHTML='<i class="shore-ripple"></i><i class="shore-ripple second"></i><img'+(location.protocol==='file:'?'':' crossorigin="anonymous"')+' src="assets/'+art.file+'" alt="">'+window.TreasureArtwork.effects(art.effect);
      scenes.set(island.id,scene);$('island-scenes').append(scene);
      const button=document.createElement('button'); button.type='button'; button.className='island';
      button.dataset.id=island.id; button.style.left=island.x+'px'; button.style.top=(island.y+20)+'px';
      button.innerHTML='<span class="landing-hint"></span><span class="island-label"><b><svg viewBox="0 0 60 60" aria-hidden="true"><text x="30" y="40" text-anchor="middle">'+island.id+'</text></svg></b>'+escape(island.name)+'</span>';
      button.addEventListener('click',()=>sail(island.id)); nodes.set(island.id,button); $('islands').append(button);
      button.addEventListener('focus',()=>{if(game)camera.show(island.x);});
    }
    syncMapCopies();
    void document.fonts.ready.then(()=>{centerIslandNumbers();syncMapCopies();});
  }
  function bindVisibleIslands(){
    window.TreasureEffects.bindIslands($('stage').classList.contains('challenge-active')?[$('challenge-island')]:camera.containers());
    window.TreasureEffects.renderIslands(reduced.matches?0:performance.now()/1000);
  }
  function syncMapCopies(){camera.syncWorld();bindVisibleIslands();}
  function fitChallengeIsland(){
    const scene=$('challenge-island-scene'),holder=scene.parentElement;
    if(!scene.dataset.artWidth||!holder.clientHeight)return;
    const width=Number(scene.dataset.artWidth),height=Number(scene.dataset.artHeight);
    const scale=Math.min((holder.clientWidth-14)/width,(holder.clientHeight-8)/height);
    scene.style.width=width*scale+'px';scene.style.height=height*scale+'px';
  }
  function drawChallengeIsland(destination){
    const scene=$('challenge-island-scene'),art=destination.art;
    if(scene.dataset.artId!==String(art.id)){
      scene.dataset.artId=art.id;scene.dataset.artWidth=art.width;scene.dataset.artHeight=art.height;
      delete scene.dataset.painted;delete scene.dataset.animated;
      scene.innerHTML='<i class="shore-ripple"></i><i class="shore-ripple second"></i><img id="challenge-island-art"'+(location.protocol==='file:'?'':' crossorigin="anonymous"')+' src="assets/'+art.file+'" alt="'+escape(destination.name)+'">'+window.TreasureArtwork.effects(art.effect);
      scene.querySelector('img').addEventListener('load',()=>window.TreasureEffects.renderIslands(reduced.matches?0:performance.now()/1000),{once:true});
    }
    fitChallengeIsland();bindVisibleIslands();
  }
  function centerIslandNumbers(){
    const ctx=document.createElement('canvas').getContext('2d');
    for(const text of document.querySelectorAll('.island-label b text')){
      const style=getComputedStyle(text);ctx.font=style.fontWeight+' '+style.fontSize+' '+style.fontFamily;
      const ink=ctx.measureText(text.textContent);
      text.setAttribute('text-anchor','start');
      text.setAttribute('x',30-(ink.actualBoundingBoxRight-ink.actualBoundingBoxLeft)/2);
      text.setAttribute('y',30+(ink.actualBoundingBoxAscent-ink.actualBoundingBoxDescent)/2);
    }
  }
  function boatPosition(team) {
    if (team.position===null) return null;
    if(team.transit){
      const trip=team.transit,forward=paths.get(trip.from+'-'+trip.to),route=forward||paths.get(trip.to+'-'+trip.from);
      if(route){const fraction=trip.travelled/E.LEG_DISTANCE,p=route.getPointAtLength(route.getTotalLength()*(forward?fraction:1-fraction));return {x:((p.x+(team.id?48:-48))%mapLayout.width+mapLayout.width)%mapLayout.width,y:p.y-34};}
    }
    const p=node(team.position);
    return {x:p.x+(team.id ? 48 : -48),y:p.y-34};
  }
  function drawMap(skipShip) {
    if (!game) return;
    const s=game.state, t=game.actor, active=s.phase==='MAP'&&!busy;
    const actorKey=s.active+':'+s.turn;if(active&&actorKey!==lastMapActor){lastMapActor=actorKey;const point=boatPosition(t);if(point)camera.show(point.x);}
    for (const island of s.islands) {
      const button=nodes.get(island.id), available=active&&game.canMove(island.id);
      const occupied=s.teams.some(team=>!team.transit&&team.position===island.id);
      button.className='island'+(available?' available':'')+(island.explored?' explored':'')+(occupied?' occupied':'');
      scenes.get(island.id).classList.toggle('explored',game.treasureIntel(island.id)==='claimed'||island.kind==='kraken'&&s.kraken.hp<=0);
      button.disabled=!available;
      const intel=game.chestIntel(island.id),enemy=!game.opponent.transit&&game.opponent.position===island.id;
      const categoryLabel=window.TreasureIslandRules.label(island);
      button.dataset.category=island.category;button.dataset.rarity=island.rarity||'';
      const hunt=s.treasure,searchDays=hunt.progress[t.id][island.id]||0,mark=game.treasureIntel(island.id);
      const treasureHint=hunt.clues[t.id].includes(island.id)?'Đã lấy manh mối':hunt.location===null?'Tìm manh mối · '+searchDays+'/'+E.TREASURE_DAYS+' ngày':'Đã kết thúc cuộc tìm manh mối';
      button.dataset.treasure=mark||'';
      const hint=mark==='marked'?'⌖ Kho báu của đội bạn · Đào 1 ngày':mark==='claimed'?'Đã nhận 3.000 vàng':enemy?'Có tàu đối thủ':island.start?'Bến cảng nâng cấp':island.kind==='kraken'?'Kraken · '+s.kraken.hp+'/'+s.kraken.maxHp+' độ bền':island.category==='harvest'?categoryLabel+' · '+TRADE.harvestYield(TRADE.product(island.product),t.upgrades.hull)+'/ngày':island.category==='treasure'?treasureHint:island.explored?'Đã khám phá':categoryLabel;
      button.classList.toggle('scouted',intel!==null&&!island.explored&&!island.start);
      button.classList.toggle('special',island.kind!=='island');
      button.querySelector('.landing-hint').textContent=hint;
      button.setAttribute('aria-label','Đảo '+island.id+' · '+node(island.id).name+' · '+categoryLabel+' · '+hint+(available?' · có thể chọn':' · chưa thể đến'));
      button.title=button.getAttribute('aria-label');
    }
    for (const path of $('routes').querySelectorAll('.route')) {
      const endpoints=[Number(path.dataset.a),Number(path.dataset.b)];
      const related=t.transit?endpoints.includes(t.transit.from)&&endpoints.includes(t.transit.to):endpoints.includes(t.position);
      path.classList.toggle('available',active&&related);
    }
    for (const team of s.teams) {
      const ship=$('ship-'+team.id), p=boatPosition(team); ship.hidden=!p;
      ship.querySelector('span').textContent=team.name;
      ship.querySelector('img').src=shipSrc(team);ship.querySelector('img').alt='Thuyền '+team.name;ship.dataset.hull=team.upgrades.hull;
      if (p&&skipShip!==team.id) { ship.style.left=p.x+'px'; ship.style.top=p.y+'px'; }
    }
    syncMapCopies();
    $('skip').hidden=true;$('skip').textContent='Kết thúc ngày';
    $('status').textContent='Lượt '+t.name;
    $('status').parentElement.dataset.team=String(t.id);
    if(mapPreview){$('skip').hidden=false;$('skip').textContent=mapReturnLabel;}
  }
  const formatDays=value=>String(Math.round(value*100)/100).replace('.',',');
  function labelMeter(element,{label,value,max,text}){
    const amount=Math.max(0,Math.min(max,value));element.setAttribute('role','progressbar');element.setAttribute('aria-label',label);element.setAttribute('aria-valuemin','0');element.setAttribute('aria-valuemax',String(max));element.setAttribute('aria-valuenow',String(Math.round(amount*100)/100));element.setAttribute('aria-valuetext',text);element.title=label+': '+text;
  }
  function drawHud() {
    if(!game)return;
    const s=game.state;
    for(const team of s.teams){
      const panel=$('team-'+team.id);panel.classList.toggle('active',s.active===team.id&&s.phase!=='RESULT');
      panel.querySelector('.team-name').textContent=team.name;
      panel.querySelector('.score').textContent=team.gold;panel.querySelector('.score').title=team.gold+' vàng';panel.querySelector('.hud-wallet').setAttribute('aria-label',team.gold+' vàng');
      panel.querySelector('.hud-coin').innerHTML=window.TreasureShipyardUI.icon('gold','hud-gold-icon');
      const hearts=panel.querySelector('.health-meter'),health=Math.max(0,Math.min(1,team.hp/team.maxHp))*5;
      labelMeter(hearts,{label:'Độ bền '+team.name,value:team.hp,max:team.maxHp,text:YARD.durability(team)+'% · Mỗi trái tim 20%'});
      hearts.innerHTML=Array.from({length:5},(_,index)=>'<span class="hud-heart" aria-hidden="true" style="--heart-fill:'+Math.max(0,Math.min(1,health-index))*100+'%"><i class="icon heart-empty"></i><i class="icon heart-red heart-fill"></i></span>').join('');
      const food=panel.querySelector('.food-meter'),remaining=TRADE.remainingDays(team),capacity=TRADE.voyageCapacity(team.upgrades.provisions);
      labelMeter(food,{label:'Dự trữ thức ăn '+team.name,value:remaining,max:capacity,text:formatDays(remaining)+'/'+capacity+' ngày'});
      food.innerHTML=window.TreasureShipyardUI.icon('provisions','food-reserve-icon')+'<b class="food-value">'+formatDays(remaining)+'/'+capacity+'</b><small>NGÀY</small>';
      panel.querySelector('.stats').innerHTML=[['cannon','attack','Sát thương',team.attack],['sail','sail','Tốc độ (hải lí/ngày)',team.speed],['cargo','cargo','Kho hàng',TRADE.cargoCount(team)+'/'+TRADE.capacity(team.upgrades.cargo)],['harvest','harvest','Tốc độ khai thác (đơn vị/ngày)',TRADE.harvestRate(team.upgrades.hull)],['consumption','consumption','Tiêu thụ thực phẩm từ kho hàng (đơn vị/ngày)',TRADE.cargoFoodRequired(team)],...(team.hungry?[['hunger','hunger','Đói · Tốc độ di chuyển giảm 50%','−50%']]:[])].map(([icon,kind,label,value])=>'<span class="ship-stat" data-stat="'+kind+'" title="'+label+': '+value+'" aria-label="'+label+': '+value+'">'+window.TreasureShipyardUI.icon(icon,'hud-stat-icon')+'<b>'+value+'</b></span>').join('');
    }
    const preparing=s.portInitial;
    $('turn-banner').textContent=s.phase==='RESULT'?'HẢI TRÌNH HOÀN TẤT':preparing?game.actor.name+' · Chuẩn bị ra khơi':game.actor.name+' · Ngày '+(game.actor.turns+1)+'/'+E.TURN_LIMIT+' · '+s.distanceLeft+' hải lí';
  }
  function button(label, action, style='green') {
    const b=document.createElement('button'); b.type='button'; b.className='button '+style; b.textContent=label;
    b.addEventListener('click',async()=>{if(busy)return;action();if(!busy&&game.state.phase==='ISLAND_BATTLE'){busy=true;try{await resolveIslandBattle();}finally{busy=false;}}render();}); $('action-buttons').append(b); return b;
  }
  function drawAction() {
    const s=game.state,phase=s.phase;
    const visible=!busy&&!mapPreview&&['PORT_CHOICE','TRAVEL','ENCOUNTER','QUESTION','ANSWER','CHEST','REWARD','BATTLE'].includes(phase);
    const challenge=visible&&(phase==='QUESTION'||phase==='ANSWER');
    const productReward=visible&&phase==='REWARD'&&s.reward?.type==='product'&&TRADE.product(s.productReward?.id);
    const retreat=visible&&phase==='REWARD'&&s.reward?.type==='retreat';
    const harvest=productReward?.category==='harvest';
    const challengeChanged=$('stage').classList.contains('challenge-active')!==challenge;
    $('stage').classList.toggle('challenge-active',challenge);
    $('action-layer').classList.toggle('island-challenge',challenge);
    $('action-layer').classList.toggle('harvest-reward',!!productReward||retreat);
    $('action-layer').classList.toggle('port-choice',phase==='PORT_CHOICE');
    $('challenge-island').hidden=!challenge;
    $('map-viewport').inert=visible;
    $('action-layer').hidden=!visible;
    if(challengeChanged&&!challenge)bindVisibleIslands();
    const key=phase+'-'+s.active+'-'+s.turn+'-'+game.actor.position+'-'+s.history.length+'-'+s.distanceLeft;
    if(!visible){lastActionKey='';$('action-content').replaceChildren();$('action-buttons').replaceChildren();$('action-title').textContent='';$('action-kicker').textContent='';return;}if(key===lastActionKey)return;lastActionKey=key;
    $('action-content').replaceChildren();$('action-buttons').replaceChildren();
    $('action-kicker').textContent=game.actor.name.toUpperCase()+' · ĐIỂM '+game.actor.position+' · '+node(game.actor.position).name.toUpperCase();
    const body=$('action-content'),t=game.actor;
    if(phase==='PORT_CHOICE'){
      const target=node(s.portDestination),defending=!game.opponent.transit&&game.opponent.position===s.portDestination;
      $('action-kicker').textContent='CĂN CỨ ĐỐI PHƯƠNG · '+target.name.toUpperCase();
      $('action-title').textContent='Chọn hướng hành động';
      body.innerHTML='<p class="port-choice-intro">Thuyền trưởng, chúng ta sẽ làm gì tại căn cứ này?</p><div class="port-choice-options"></div><p class="port-defense">Pháo cảng: <b>10 sát thương / loạt</b> · Không thể nâng cấp'+(defending?'<br>Tàu đối phương đang ở cảng và sẽ cùng bắn trả.':'')+'</p>';
      const options=body.querySelector('.port-choice-options');
      for(const [choice,title,detail] of [['pass','Đi qua','Ghé cảng, sửa tàu và tiếp tế. Không giao chiến.'],['raid','Cướp bóc','Sống sót qua 10 loạt bắn trả để lấy 50% vàng đối phương.']]){
        const b=document.createElement('button');b.type='button';b.className='port-option '+choice;b.dataset.portChoice=choice;
        b.innerHTML=window.TreasureShipyardUI.icon(choice,'port-choice-icon')+'<strong>'+title+'</strong><span>'+detail+'</span>';
        b.addEventListener('click',()=>{if(busy)return;const id=game.selectPort(choice);if(id!==false)void sail(id,true);});options.append(b);
      }
    }
    if(phase==='TRAVEL'){
      const trip=t.transit,daysLeft=Math.ceil((E.LEG_DISTANCE-trip.travelled)/t.speed);
      $('action-title').textContent='Tàu đang trên hải trình';
      $('action-kicker').textContent=t.name+' · Ngày '+(t.turns+1);
      body.innerHTML='<div class="encounter-art"><img src="'+shipSrc(t)+'" alt="Chiến thuyền"></div><p class="encounter-copy">Đang đến <b>'+escape(node(trip.to).name)+'</b><br>Còn '+daysLeft+' ngày để đến đích</p>';
      const supply=document.createElement('p');supply.className='combat-preview';
      const plan=TRADE.daySupply(t);
      supply.textContent='Số thực phẩm dự trữ còn '+formatDays(TRADE.remainingDays(t)-plan.reserveUsed)+' ngày';
      if(plan.shortfall)supply.textContent+=' · Cuối ngày còn thiếu '+plan.shortfall+' thức ăn: mất '+plan.shortfall+' độ bền và giảm 50% tốc độ';
      else if(t.hungry)supply.textContent+=' · Ăn đủ cuối ngày sẽ hết giảm tốc vì đói';
      body.append(supply);
      button('Kết thúc ngày',()=>game.continueTravel());
    }
    if(phase==='ENCOUNTER'){
      const island=game.island,enemy=game.enemyHere;
      $('action-title').textContent=enemy?'Tàu đối thủ đang ở đây!':'Đối mặt thủy quái Kraken';
      const incoming=enemy?game.incoming(t,game.opponent.attack):game.incoming(t,s.kraken.attack);
      body.innerHTML='<div class="encounter-art"><img src="assets/'+node(island.id).art.file+'" alt=""></div><p class="encounter-copy">'+(enemy?'Chọn tấn công để khai hỏa trước. Tàu đối thủ còn sống sẽ phản công.':'Kraken còn <b>'+s.kraken.hp+'/'+s.kraken.maxHp+' độ bền</b> · <b>'+s.kraken.attack+' sát thương</b>.<br>Chọn tấn công; Kraken còn sống sẽ phản đòn.')+'</p>';
      if(enemy||island.kind==='kraken'){const warning=document.createElement('p'),protectedAttack=!enemy&&game.monsterSafety(s.kraken,1).protectedAttack;warning.className=incoming>=t.hp&&!protectedAttack?'combat-warning':'combat-preview';warning.textContent=protectedAttack?'Lần tấn công đầu sau sửa cảng: tàu sẽ tự ngừng giao tranh để tránh chìm.':'Phản đòn dự kiến: '+Math.round(incoming/t.maxHp*1000)/10+'% độ bền'+(incoming>=t.hp?' · Tàu sẽ chìm nếu chưa hạ được mục tiêu!':'');body.append(warning);}
      if(island.kind==='kraken'){const total=document.createElement('p');total.className='combat-preview';total.textContent='Tổng sát thương lên Kraken: '+s.teams.map(team=>team.name+' '+s.kraken.damageBy[team.id]).join(' · ');body.append(total);}
      if(enemy)button('⚔ Tấn công đối thủ',()=>game.encounter('duel'),'red');
      if(game.canExplore())button(island.kind==='kraken'?'⚔ Tấn công Kraken':'Khám phá đảo',()=>game.encounter('explore'));
      button('Dừng tại đây',()=>game.encounter('leave'),'');
    }
    if(phase==='QUESTION'||phase==='ANSWER'){
      const destination=node(s.questionIsland);
      $('action-kicker').textContent=t.name.toUpperCase()+' · XIN PHÉP TỚI ĐẢO '+destination.id;
      drawChallengeIsland(destination);
      $('challenge-ship').src=shipSrc(t);
      $('challenge-island-number').textContent=destination.id;
      $('challenge-island-name').textContent=destination.name;
      $('challenge-island-description').textContent='Đảo chưa khám phá. Trả lời đúng để được di chuyển tới đây; trả lời sai thì tàu giữ nguyên vị trí và kết thúc ngày.';
      $('action-title').innerHTML='<svg class="challenge-title-curve" viewBox="0 0 600 110" role="img" aria-label="THỬ THÁCH ĐẢO"><defs><path id="challenge-title-arc" d="M34 94 Q300 18 566 94"/></defs><text><textPath href="#challenge-title-arc" startOffset="50%" text-anchor="middle">THỬ THÁCH ĐẢO</textPath></text></svg>';
      $('action-kicker').textContent=t.name+' · '+(phase==='QUESTION'?'Chọn một đáp án':s.correct?'Đã mở khóa di chuyển':'Chưa đúng rồi');
      body.innerHTML='<p class="question-text'+(s.question.text.length>180?' long':'')+'">'+escape(s.question.text)+'</p><div class="answer-grid"></div>';
      let pendingAnswer=null;
      const submit=phase==='QUESTION'?button('Trả lời',()=>{if(game.answer(pendingAnswer))tone(game.state.correct?'good':'bad');}):null;
      if(submit){submit.id='submit-answer';submit.disabled=true;}
      s.question.options.forEach((option,i)=>{
        const b=document.createElement('button');b.className='answer-option'+(option.length>80?' long':'');b.type='button';b.innerHTML='<b>'+String.fromCharCode(65+i)+'.</b><span>'+escape(option)+'</span>';b.title=option;b.disabled=phase==='ANSWER';b.setAttribute('aria-pressed',String(phase==='ANSWER'&&i===s.selected));
        if(phase==='ANSWER'&&i===s.question.answer)b.classList.add('correct');if(phase==='ANSWER'&&i===s.selected&&!s.correct)b.classList.add('wrong');
        b.addEventListener('click',()=>{
          if(busy||game.state.phase!=='QUESTION')return;
          pendingAnswer=i;
          for(const [index,option] of [...body.querySelectorAll('.answer-option')].entries()){
            option.classList.toggle('selected',index===i);option.setAttribute('aria-pressed',String(index===i));
          }
          submit.disabled=false;
        });body.querySelector('.answer-grid').append(b);
      });
      if(phase==='ANSWER'){
        if(s.productReward){const p=document.createElement('p'),item=TRADE.product(s.productReward.id);p.className='product-answer'+(s.productReward.full?' full':'');p.textContent=s.productReward.full?'Kho hàng đầy: '+item.name+' vẫn ở lại đảo.':'Nhận '+s.productReward.quantity+' '+item.name+' · Kho hàng '+TRADE.cargoCount(t)+' / '+TRADE.capacity(t.upgrades.cargo);body.append(p);}
        button(s.correct?'Di chuyển':'Kết thúc ngày',()=>{const id=s.pendingDestination,allowed=s.correct;game.continueAnswer();if(allowed)void sail(id);},s.correct?'green':'');
      }
    }
    if(phase==='CHEST'){
      $('action-title').textContent='Đã đào thấy kho báu!';body.innerHTML='<img class="chest-art closed" src="assets/chest-closed.png" alt="Rương kho báu chưa mở"><p class="chest-caption">Rương duy nhất trên bản đồ</p><p>Đã dành 1 ngày đào. Mở rương để nhận <b>3.000 vàng</b>.</p>';
      button('✦ MỞ RƯƠNG',()=>{if(game.openChest())sounds.play('chest');});
    }
    if(phase==='REWARD'){
      const r=s.reward;
      $('action-title').textContent=r.type!=='chest'?r.effect.name:r.blocked?'Khiên đã bảo vệ bạn!':r.effect.harmful?'Cẩn thận, một cạm bẫy!':'Kho báu đã xuất hiện!';
      if(retreat){
        const defender=s.battle.type==='island'?game.island.defender:s.kraken;
        body.innerHTML='<div class="reward-layout"><img class="chest-art" src="assets/'+node(t.position).art.file+'" alt=""><div class="reward-details"><h3>Tàu còn '+YARD.durability(t)+'% độ bền</h3><p>Quay về cảng sửa tàu để đặt lại lần tấn công. Nếu đánh tiếp trước khi sửa, tàu có thể chìm.</p><p class="island-battle-summary">Mục tiêu còn '+defender.hp+'/'+defender.maxHp+' độ bền. Phần máu đã mất của mục tiêu được giữ lại.</p></div></div><p class="harvest-status" role="status">Đã ngừng giao tranh · Chưa nhận chiến lợi phẩm</p>';
        button('Tiếp tục hành trình',()=>game.continueReward());
      }else if(productReward){
        const reward=s.productReward,item=productReward;
        const description=item.description||'Chiến lợi phẩm độc nhất từ '+node(t.position).name+'. Bán cho gian thương được 1.000 vàng.';
        body.innerHTML='<div class="reward-layout"><img class="chest-art" src="assets/product-'+String(item.id).padStart(2,'0')+'.png" alt="'+escape(item.name)+'"><div class="reward-details"><h3>'+escape(item.name)+'</h3><p>'+escape(description)+'</p></div></div>';
        if(harvest){
          const label=document.createElement('p');label.className='harvest-edibility '+(item.edible?'edible':'inedible');
          const text=document.createElement('strong');text.textContent=item.edible?'Thực phẩm ăn được':'Không ăn được';
          label.append(text);body.querySelector('.reward-details h3').after(label);
        }
        if(!harvest&&s.battle?.type==='island'){
          const summary=document.createElement('p');summary.className='island-battle-summary';
          summary.textContent='Hạ đảo sau '+s.battle.rounds.length+' lượt bắn · Tàu còn '+t.hp+'/'+t.maxHp+' độ bền';body.querySelector('.reward-details').append(summary);
        }
        if(harvest&&item.edible){
          const summary=document.createElement('p');summary.className='harvest-food-summary';
          const parts=[];
          if(reward.dailyFood)parts.push('Khẩu phần hôm nay: '+reward.dailyFood+' đơn vị');
          if(reward.reserveFood)parts.push('Kho lương: +'+reward.reserveFood+' đơn vị (+'+formatDays(reward.reserveDays)+' ngày)');
          if(reward.discarded)parts.push('Kho lương đã đầy, để lại '+reward.discarded+' đơn vị');
          summary.textContent=parts.join(' · ');body.querySelector('.reward-details').append(summary);
        }
        const status=document.createElement('p');status.className='harvest-status';status.setAttribute('role','status');
        status.textContent=!harvest?'Nhận '+reward.quantity+' '+item.name+' · Không chiếm kho hàng':reward.full?'Kho hàng đầy, chưa cất thêm '+item.name:reward.quantity>0?'Đã khai thác và cất vào kho hàng '+reward.quantity+' '+item.name:'Đã khai thác '+reward.harvested+' '+item.name+' để tiếp tế';
        body.append(status);
        button(harvest?'Kết thúc ngày':'Tiếp tục hành trình',()=>game.continueReward());
      }else{
      body.innerHTML='<div class="reward-layout"><img class="chest-art" src="assets/'+(r.type==='chest'?'chest-open.png':node(t.position).art.file)+'" alt=""><div class="reward-details"><span class="reward-icon">'+escape(r.blocked?'◈':r.effect.icon)+'</span><h3>'+escape(r.effect.name)+'</h3><p>'+escape(r.blocked?'Hiệu ứng xấu bị chặn. Đã dùng một khiên.':r.effect.detail)+'</p></div></div>'+teamStats(t);
      if(s.productReward&&!s.productReward.full){const line=document.createElement('p');line.className='product-answer';line.textContent=(TRADE.product(s.productReward.id).category==='harvest'?'Cất vào kho: ':'Nhận ')+s.productReward.quantity+' '+TRADE.product(s.productReward.id).name+(TRADE.product(s.productReward.id).category==='combat'?' · Không chiếm kho hàng':' · Kho hàng '+TRADE.cargoCount(t)+' / '+TRADE.capacity(t.upgrades.cargo));body.append(line);}
      button(['search','clue'].includes(r.type)?'Kết thúc ngày tìm kiếm':['chest','treasure-arrival'].includes(r.type)?'Kết thúc ngày':s.purpose==='island'&&game.island.category==='harvest'?'Kết thúc ngày khai thác':'Tiếp tục hành trình',()=>game.continueReward());
      }
    }
    if(phase==='BATTLE'){
      const b=s.battle,a=s.teams[b.attacker];$('action-title').textContent=b.type==='raid'?'CƯỚP BÓC THÀNH CÔNG':b.type==='island'?'HOÀN TẤT LƯỢT ĐÁNH':b.type==='kraken'?'ĐẠI CHIẾN KRAKEN':'HAI TÀU GIAO CHIẾN';
      const defender=b.type==='island'?'<div class="battle-team"><img src="assets/'+node(a.position).art.file+'" alt="Đảo chiến đấu"><div>'+escape(node(a.position).name)+'</div><strong>−'+b.damageB+' ĐỘ BỀN</strong><small>Còn '+game.island.defender.hp+'/'+game.island.defender.maxHp+' · Đánh tiếp vào ngày sau</small></div>':b.type==='raid'?'<div class="battle-team"><img src="assets/'+node(a.position).art.file+'" alt="Căn cứ đối phương"><div>'+escape(node(a.position).name)+'</div><strong>+'+b.gold+' VÀNG</strong><small>Cảng bắn '+b.portShots+' loạt · Tàu phòng thủ bắn '+b.shotsB+' loạt</small></div>':b.type==='kraken'?'<div class="battle-team"><img src="assets/'+node(a.position).art.file+'" alt="Kraken"><div>Kraken</div><strong>−'+b.damageB+' MÁU</strong><small>♥ '+s.kraken.hp+'/'+s.kraken.maxHp+' · ⚔ '+s.kraken.attack+' sát thương</small></div>':battleTeam(s.teams[b.defender],b.damageB,b.shields[1]);
      body.innerHTML='<div class="battle-ships">'+battleTeam(a,b.damageA,b.shields[0])+'<div class="versus"><span class="icon swords" aria-hidden="true"></span></div>'+defender+'</div><p class="battle-caption">'+escape(a.name)+' khai hỏa trước.'+(b.type==='duel'?' Hai bên đã bắn '+b.shotsA+' / '+b.shotsB+' loạt pháo trong lượt này.':b.type==='raid'?' Đã vượt qua 10 loạt bắn trả.':' Đã bắn '+b.rounds.length+' / 10 loạt. Mục tiêu giữ lại độ bền còn lại.')+'</p>';
      button('Kết thúc ngày',()=>game.continueBattle());
    }
    $('action-card').scrollTop=0;requestAnimationFrame(()=>{const first=$('action-card').querySelector('button:not(:disabled)');(first||$('action-card')).focus({preventScroll:true});});
  }
  function teamStats(t){return '<div class="reward-stats"><span>♥ Độ bền '+YARD.durability(t)+'%</span><span>⚔ '+t.attack+' sát thương</span><span>◈ '+t.armor+' giáp</span></div>';}
  function battleTeam(t,damage,blocked){return '<div class="battle-team"><img src="'+shipSrc(t)+'" alt=""><div>'+escape(t.name)+'</div><strong>'+(blocked&&!damage?'KHIÊN ĐÃ CHẶN':'−'+Math.round(damage/t.maxHp*1000)/10+'% ĐỘ BỀN')+'</strong><small>♥ Còn '+YARD.durability(t)+'% · ⚔ '+t.attack+' · ◈ '+t.armor+'</small></div>';}
  function drawResult() {
    const s=game.state,isResult=s.phase==='RESULT';
    $('stage').classList.toggle('showing-result',isResult&&viewResult);
    $('result').hidden=!(isResult&&viewResult); $('show-result').hidden=!(isResult&&!viewResult);
    if(!isResult)return;
    if(victoryGame!==game){victoryGame=game;sounds.stop();sounds.setMusic(false);sounds.play('victory');}
    const winner=s.winner===null?null:s.teams[s.winner]; $('winner-name').textContent=winner?winner.name+' chiến thắng!':'Hai đội hòa nhau!';
    $('winner-reason').textContent=s.kraken.hp<=0?'Kraken đã bị hạ · So tổng sát thương':s.teams.some(t=>t.hp<=0)?s.reason:'Hết '+E.TURN_LIMIT+' lượt mỗi đội · So vàng đang giữ';$('winner-reason').title=s.reason;
    $('winner-captain').hidden=!winner;$('loser-captain').hidden=!winner;
    $('winner-captain').className='captain result-captain '+(winner?.id?'blue':'red');
    $('loser-captain').className='result-loser '+(winner?.id?'red':'blue');
    $('result-scores').innerHTML='<h3>✦ Kết quả hải trình</h3>'+s.teams.map(t=>'<div class="result-score-row">'+escape(t.name)+(t.id===s.winner?' ♛':'')+'<span>Vàng đang giữ: '+t.gold+' · Độ bền '+YARD.durability(t)+'%</span><span>Sát thương Kraken: '+s.kraken.damageBy[t.id]+' · Đã chơi '+t.turns+'/'+E.TURN_LIMIT+' lượt</span></div>').join('');
  }
  function render() { if(game){if(game.state.phase==='BATTLE'&&lastBattle!==game.state.battle){lastBattle=game.state.battle;sounds.stop('sail');sounds.play('battle');}drawMap();drawHud();drawAction();portUI.render(game,busy,mapPreview);drawResult();} }
  async function resolveIslandBattle(){
    const current=game;if(!current||!['ISLAND_BATTLE','DUEL_BATTLE','PORT_BATTLE'].includes(current.state.phase))return;
    const duel=current.state.phase==='DUEL_BATTLE',raid=current.state.phase==='PORT_BATTLE';
    const controller=new AbortController();islandBattleAbort=controller;
    sounds.stop('sail');sounds.play('battle');
    const islandId=current.actor.position,teamId=current.actor.id;
    drawMap();drawHud();$('action-layer').hidden=true;
    try{
      await window.TreasureEffects.playIslandBattle({stage:$('stage'),reduced:reduced.matches,signal:controller.signal,
        ships:()=>camera.ships(teamId),islands:()=>duel?camera.ships(1-teamId):camera.containers().map(world=>world.querySelector('.island-scene[data-id="'+islandId+'"]')).filter(Boolean),
        label:duel?'Hai tàu đang giao chiến · Tối đa 10 loạt pháo mỗi bên':current.actor.name+' đang giao chiến tại '+node(islandId).name});
    }catch{/* Missing or canceled decorative effects must not prevent battle resolution. */}
    finally{
      if(controller.signal.aborted)sounds.stop('battle');if(islandBattleAbort===controller)islandBattleAbort=null;
      if(game===current&&!controller.signal.aborted){
        if(raid&&current.state.phase==='PORT_BATTLE'){current.raidPort();lastBattle=current.state.battle;}
        else if(duel&&current.state.phase==='DUEL_BATTLE'){current.fight();lastBattle=current.state.battle;}
        else if(!duel&&current.state.phase==='ISLAND_BATTLE')current.fightIsland();
      }
    }
  }
  async function sail(id,portChosen=false) {
    if(!game||busy||!$('info-layer').hidden)return;
    if(!game.canMove(id))return;
    if(!portChosen&&game.choosePort(id)){render();return;}
    const sailingGame=game,who=game.actor.id, oldPoint=boatPosition(game.actor);
    const result=game.move(id); if(!result)return;
    if(result.question){render();return;}
    const from=result.from;
    if(from!==id)sounds.play('sail');
    busy=true;drawMap(who);drawHud();$('action-layer').hidden=true;
    const ship=$('ship-'+who), end=boatPosition(game.state.teams[who]);
    camera.show(end.x);
    ship.hidden=false;
    try {
      if(oldPoint&&from!==id){
        const forward=paths.get(from+'-'+id), path=forward||paths.get(id+'-'+from);
        const length=path.getTotalLength(),startTime=performance.now(),duration=reduced.matches?1:950;
        await new Promise(resolve=>{
          function frame(now){
            if(game!==sailingGame){resolve();return;}
            const t=Math.min(1,(now-startTime)/duration),eased=t*t*(3-2*t);
            const fraction=result.start+(result.end-result.start)*eased;
            const p=path.getPointAtLength(length*(forward?fraction:1-fraction));
            const x=((p.x+(who?48:-48))%mapLayout.width+mapLayout.width)%mapLayout.width;
            for(const boat of camera.ships(who)){boat.style.left=x+'px';boat.style.top=(p.y-34)+'px';}
            if(t<1)requestAnimationFrame(frame);else resolve();
          }requestAnimationFrame(frame);
        });
      }else{
        ship.style.left=end.x+'px';ship.style.top=end.y+'px';
        if(from===null)await ship.animate([{opacity:0,scale:.5},{opacity:1,scale:1}],{duration:reduced.matches?1:450}).finished;
      }
    }catch{/* A canceled animation must never strand the game. */}
    finally{
      if(game===sailingGame){
        try{
          await resolveIslandBattle();
          const s=sailingGame.state;
          if(game===sailingGame&&s.phase==='REWARD'&&s.reward?.type==='product'&&TRADE.product(s.productReward?.id)?.category==='harvest'&&!s.productReward.full){
            sounds.stop('sail');
            await sounds.play('chest',{wait:true});
          }
        }finally{if(game===sailingGame){busy=false;render();}}
      }
    }
  }
  async function start() {
    if(!bank||classLoading||launching)return;
    launching=true;
    const selectedBank=bank, generation=classGeneration;
    renderClasses();loadingScreen(true);
    try{
      const loaded=await prepareArtwork(generation);
      if(bank!==selectedBank||generation!==classGeneration)return;
      if(!loaded)throw Error('Chưa tải đủ ảnh trò chơi. Hãy chọn lại buổi học để thử lại.');
      for(const img of document.querySelectorAll('img[data-game-src]')){img.src=img.dataset.gameSrc;img.removeAttribute('data-game-src');}
      $('loading-status').textContent='Đang sắp xếp các đảo…';
      await new Promise(requestAnimationFrame);
      if(bank!==selectedBank||generation!==classGeneration)return;
      buildMap();$('game-progress').value=100;$('loading-status').textContent='Hải trình đã sẵn sàng!';
      launchFirst=Math.random()<.5?0:1;
      game=new E.Game({questions:bank,names:['Đội Đỏ','Đội Xanh'],first:launchFirst,map:mapLayout});
      victoryGame=null;lastBattle=null;sounds.stop();sounds.setMusic(true);
      viewResult=true;lastActionKey='';$('setup').hidden=true;$('stage').classList.remove('preparing');$('map-viewport').inert=false;render();
      const first=[...nodes.values()].find(n=>!n.disabled);if(first)first.focus({preventScroll:true});
    }finally{
      if(generation===classGeneration){launching=false;loadingScreen(false);renderClasses();}
    }
  }
  $('setup-form').addEventListener('submit',event=>event.preventDefault());
  $('skip').addEventListener('click',()=>{if(busy)return;if(mapPreview){mapPreview=false;render();$('map-button').focus({preventScroll:true});return;}if(game?.skipRemaining())render();});
  function showInfo(title,html,kind='') {
    $('info-layer').querySelector('.info-card').classList.toggle('chart-card',kind==='chart');
    $('info-layer').querySelector('.info-card').classList.toggle('rules-card',kind==='rules');
    focusBeforeInfo=document.activeElement;$('info-title').textContent=title;$('info-content').innerHTML=html;
    $('info-layer').hidden=false;$('info-content').scrollTop=0;$('close-info').focus({preventScroll:true});
  }
  function closeInfo() { $('info-layer').hidden=true;$('info-content').replaceChildren();if(focusBeforeInfo&&focusBeforeInfo.isConnected)focusBeforeInfo.focus({preventScroll:true}); }
  $('close-info').addEventListener('click',closeInfo);
  $('info-layer').addEventListener('click',event=>{if(event.target===$('info-layer'))closeInfo();});
  function historyHtml() {
    if(!game||!game.state.history.length)return '<p>Hải trình chưa có câu trả lời nào.</p>';
    return game.state.history.map((h,i)=>'<article class="review-row"><small>Câu '+(i+1)+' · '+escape(h.team)+' · Đảo '+h.island+'</small><p><b>'+escape(h.question.text)+'</b></p><p class="'+(h.correct?'good':'bad')+'">Đã chọn: '+escape(h.question.options[h.selected])+' · '+(h.correct?'Đúng':'Sai')+'</p><p>Đáp án: '+escape(h.question.options[h.question.answer])+'</p><small>'+escape(h.question.explanation)+'</small></article>').join('');
  }
  $('review').addEventListener('click',()=>showInfo('Kết quả & câu hỏi','<p>'+escape(game.state.reason)+'</p>'+$('result-scores').innerHTML+'<h3>Cùng xem lại câu hỏi</h3>'+historyHtml()));
  $('map-button').addEventListener('click',()=>{
    if(!game||busy||upgrading)return;
    if(portUI.closeMarketPreview()){render();$('merchant-button').focus({preventScroll:true});return;}
    if(!$('info-layer').hidden)closeInfo();
    if(mapPreview){mapPreview=false;render();return;}
    if(game.state.phase==='PORT'&&!game.state.portInitial)game.leavePort();
    mapPreview=game.state.phase!=='MAP';
    mapReturnLabel=game.state.phase==='PORT'?($('stage').classList.contains('merchant-active')?'Về cửa hàng':'Về cảng'):'Tiếp tục lượt';
    render();const point=boatPosition(game.actor);if(point)camera.show(point.x);
    if(mapPreview)$('skip').focus({preventScroll:true});
  });
  const goHome=()=>{if(sourceBridge){sounds.dispose();sourceBridge.close();}else resetToPicker();};
  $('exit-button').addEventListener('click',()=>pickerView==='lessons'?backToClasses():goHome());$('game-home').addEventListener('click',goHome);
  $('ship-button').addEventListener('click',()=>{
    if(!game||busy||upgrading)return;
    if(portUI.returnToYard())return;
    showInfo('Chiến thuyền · '+game.actor.name,TRADE_UI.ship(game.actor));
    const rules=document.createElement('button');rules.id='fleet-rules';rules.className='button small';rules.type='button';rules.textContent='Luật hải trình';rules.addEventListener('click',showRules);$('info-content').querySelector('.fleet-portrait').append(rules);
  });
  function showRules(){
    const rules=[
      ['Căn cứ','Đội Xanh xuất phát ở Dover (ô 1), Đội Đỏ ở Bristol (ô 24). Mỗi đội có 100 vàng, 100% độ bền, sát thương 5, 1 pháo và 1 cột buồm chính nhỏ. Cập bến một trong hai căn cứ tự hồi đầy độ bền, tiếp đầy lương thực và mở xưởng nâng cấp.'],
      ['Đảo chưa khám phá','Câu hỏi xuất hiện trước khi đi tới đảo chưa khám phá. Đúng: mở khóa di chuyển đến đảo đó, không cộng vàng. Sai: còn một nửa vàng (làm tròn xuống), giữ nguyên vị trí và kết thúc ngày. Một chuyến đi nhiều ngày chỉ hỏi một lần; chỉ đánh dấu đã khám phá khi cập bến. Đảo đã khám phá không hỏi lại khi đi tới, khai thác hoặc giao chiến.'],
      ['Nâng cấp','Đại bác, Thân tàu, Buồm, Kho hàng và Kho lương bắt đầu Lv0, tối đa Lv3. Giá nâng cấp: Lv0 → Lv1 là 100 vàng, Lv1 → Lv2 là 500 vàng, Lv2 → Lv3 là 1.000 vàng. Đại bác, Buồm, Kho hàng và Kho lương không được vượt cấp Thân tàu. Đại bác thêm 5 sát thương; Thân tàu bắt đầu 50 điểm độ bền và khai thác 25 đơn vị/ngày, mỗi cấp thêm và phục hồi 50 điểm độ bền, thêm 25 đơn vị khai thác/ngày; Buồm thêm 10 hải lí/ngày.'],
      ['Di chuyển','24 điểm đến nối vòng, mỗi điểm có 3 đường. Mỗi lượt của một đội là một ngày; mỗi đường nối dài 30 hải lí. Tốc độ ban đầu 10 hải lí/ngày. Khi đang giữa đường có thể đi tiếp hoặc quay lại: đã đi 20 hải lí thì cần đi lại 20 hải lí để về đảo cũ, rồi mới rẽ sang đường khác. Quãng đường dư được dùng tiếp trong cùng ngày. Nâng buồm có hiệu lực từ ngày tiếp theo; chuẩn bị ra khơi áp dụng ngay.'],
      ['Kho hàng và sản vật','Kho hàng Lv0 chứa 100 đơn vị, mỗi cấp thêm 50 đơn vị. Cả tài nguyên thường và quý đều khai thác 25/50/75/100 đơn vị/ngày ở Thân tàu Lv0/1/2/3 và dùng hết phần còn lại của ngày. Có thể ở lại đảo khai thác trực tiếp ngày sau, không hỏi lại. Khi kho hàng đầy, vẫn được khai thác tài nguyên ăn được để dùng trong ngày và bù vào kho lương, ở mọi mức độ bền. Thực phẩm mới ưu tiên bù khẩu phần hôm nay, phần dư cất vào kho hàng rồi vào kho lương, tối đa sức dự trữ của tàu; giữ cả phần ngày lẻ. Vật phẩm không ăn được chỉ thu tới khi đầy kho. Mỗi đảo chiến đấu có đúng một chiến lợi phẩm cho cả trận, không tái sinh và không chiếm kho hàng. Đảo kho báu dùng để tìm manh mối.'],
      ['Dự trữ hải trình','Dự trữ ban đầu 3 ngày, mỗi cấp thêm 3 ngày. Mỗi lượt của đội là một ngày, kể cả đứng yên. Cuối ngày chỉ trừ dự trữ cho phần khẩu phần chưa được thực phẩm mới khai thác bù đủ. Về căn cứ trong ngày được tiếp tế đầy. Ngày dùng nốt dự trữ vẫn an toàn. Khi hết lương thực và độ bền còn 70% trở xuống, tàu tự ăn sản vật trong kho để bù khẩu phần, kể cả khi kho không đủ. Mỗi đơn vị thức ăn vẫn còn thiếu làm mất 1 điểm độ bền. Tàu bị đói giảm 50% tốc độ di chuyển cho tới khi ăn đủ hoặc về cảng tiếp tế. Độ bền về 0% thì tàu chìm.'],
      ['Thực phẩm thay thế','Khẩu phần mỗi ngày bằng 20% sức chứa tối đa: 20/30/40/50 đơn vị ở Kho hàng Lv0/1/2/3. Thực phẩm mới khai thác bù khẩu phần trước, sau đó dùng lương thực dự trữ. Nếu vẫn thiếu và độ bền hiện tại còn 70% trở xuống, tự lấy đúng phần thiếu từ tài nguyên ăn được trong kho, ưu tiên thường trước quý, giữ nguyên độ bền. Trên 70% chưa tự ăn hàng trong kho. Sau mỗi ngày đã ăn hàng trong kho, khẩu phần kho hàng cho lần tiếp theo tăng 25% so với lần trước, làm tròn lên (20 → 25 → 32 → 40…). Mức tăng theo riêng từng đội, giữ qua ngày dùng dự trữ hoặc thực phẩm mới và chỉ đặt lại khi về cảng tiếp tế. Nếu chỉ thiếu một phần ngày, lấy theo tỷ lệ khẩu phần kho hàng hiện tại. Không đủ phần cần lấy thì dùng hết phần ăn được hiện có; mỗi đơn vị còn thiếu trừ 1 điểm độ bền. Khi bị đói, tốc độ giảm 50%; không cộng dồn mức giảm qua nhiều ngày. Thực phẩm khai thác vượt kho bổ sung lại kho lương theo cùng khẩu phần.'],
      ['Gian thương','Mỗi cảng có một gian thương riêng. Tài nguyên khai thác thường luôn bán 1 vàng/đơn vị, loại quý 5 vàng/đơn vị tại cả hai cảng; chiến lợi phẩm độc nhất vẫn 1.000 vàng/món. Giá cố định qua các ngày và các chuyến đi. Bán sản vật lấy vàng nâng cấp tàu; chiến lợi phẩm không chiếm kho hàng.'],
      ['Kho báu','Ba đảo kho báu là nơi tìm manh mối. Tìm 3 ngày trên một đảo được một manh mối; mỗi đội chỉ lấy một manh mối từ mỗi đảo. Đội đầu tiên đủ 2 manh mối làm xuất hiện rương duy nhất, ngẫu nhiên trên 7 đảo ngoài căn cứ thuộc vùng nhà (Xanh: 2–8, Đỏ: 17–23). Chỉ đội đó thấy vị trí và được đào. Cập bến rồi dành riêng 1 ngày đào, mở rương nhận 3.000 vàng. Tiến độ lưu riêng cho từng đội; kho báu không chiếm Kho hàng.'],
      ['Ba vùng đảo','Vùng 1 và 3: mỗi vùng có một căn cứ, ba khai thác thường, một khai thác quý, hai chiến đấu và một kho báu. Mỗi căn cứ nối trực tiếp một đảo khai thác thực phẩm ăn được gần cảng: ô 2 hoặc 3 bên Dover, ô 22 hoặc 23 bên Bristol. Đảo quý ở ô 8 và 17 nối thẳng vào vùng 2. Vùng 2 có hai khai thác quý, bốn chiến đấu, một kho báu và Kraken ở tâm (ô 12 hoặc 13).'],
      ['Hai tàu gặp nhau','Ngoài hai cảng Dover và Bristol, tàu tới đảo có đối thủ hoặc chạm đối thủ trên cùng tuyến đường sẽ tự giao chiến. Tàu đang di chuyển bắn trước; mỗi bên bắn tối đa 10 lần trong lượt đó. Tàu bị hạ không được bắn trả, và giao tranh dừng ngay khi một tàu chìm. Trên biển, tàu dừng tại điểm gặp nhau và kết thúc quãng đường của ngày; ngày sau có thể đi tiếp hoặc quay lại. Tại cảng khởi đầu không tự đánh nhau: chọn Đi qua hoặc Cướp bóc. Cướp bóc phải sống sót qua 10 loạt pháo cảng (10 sát thương/loạt, không nâng cấp) và tàu phòng thủ nếu có, mới lấy 50% vàng đang có của đối phương (làm tròn xuống). Không có vàng thì không nhận vàng. Không tự rút lui giữ máu; tàu chìm kết thúc trận ngay.'],
      ['Đảo chiến đấu','Mỗi đảo chiến đấu có 500 độ bền, gây 10 sát thương mỗi phát. Khi cập đảo, tàu tự giao chiến ngay trên bản đồ tối đa 10 loạt trong một ngày. Hết loạt thứ 10, giữ độ bền mục tiêu để đánh tiếp ngày sau. Dừng sớm khi một bên hết độ bền hoặc kích hoạt bảo vệ lần đầu. Tàu bắn trước; bên bị hạ không phản công. Thắng đảo nhận chiến lợi phẩm độc nhất, bán được 1.000 vàng và không chiếm kho hàng.'],
      ['Bảo vệ lần tấn công đầu','Lần đầu tấn công đảo chiến đấu hoặc Kraken kể từ khi sửa ở cảng: nếu giao tranh có thể làm tàu hết độ bền, tự ngừng ở 30% độ bền tối đa để người chơi quay về sửa. Nếu tàu vốn dưới 30% thì dừng ở độ bền hiện tại, không tự hồi máu. Tấn công tiếp khi chưa sửa sẽ tính sát thương bình thường và có thể chìm. Cập một trong hai cảng sẽ sửa đầy tàu và đặt lại lần tấn công. Mỗi đội tính riêng; đấu với tàu đối thủ không áp dụng.'],
      ['Máu đảo sau giao tranh','Đảo giữ nguyên lượng độ bền còn lại sau từng lần bị tấn công, kể cả khi tàu rút lui, đổi đội hay về cảng sửa. Khi quay lại, đánh tiếp từ lượng máu đó; sửa tàu không hồi máu cho đảo. Chỉ nhận chiến lợi phẩm khi đã hạ đảo.'],
      ['Chiến thắng','Mỗi đội được chơi tối đa '+E.TURN_LIMIT+' lượt; khi cả hai hoàn thành, đội còn giữ nhiều vàng chưa sử dụng hơn thắng. Không cộng vàng đã tiêu hoặc giá trị hàng chưa bán. Nếu một tàu hết độ bền, đội còn sống thắng ngay. Khi Kraken bị tiêu diệt, so tổng sát thương thực tế mỗi đội đã gây lên Kraken (không cộng phần vượt máu còn lại); đội gây nhiều hơn thắng. Sát thương bằng nhau thì so vàng đang giữ; vàng cũng bằng nhau thì hòa. Kraken có 1.000 độ bền, 30 sát thương và chỉ phản đòn khi còn sống.'],
      ['Phân loại sản vật','Chỉ Nấm Truffle, Vây cá mập, Nước mắt người cá và Đá sấm sét là khai thác quý. Cá Voi thuộc khai thác thường, cho Mỡ cá voi; Nhân sâm và Mỡ cá voi không ăn được.']
    ];
    showInfo('Luật hải trình','<div class="rules-grid">'+rules.map(([h,p],i)=>'<div class="rule-box"><h3>'+['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII','XIII','XIV','XV','XVI','XVII','XVIII','XIX','XX'][i]+' · '+h+'</h3><p>'+p+'</p></div>').join('')+'</div>','rules');
  }
  // Delegated UI feedback also covers buttons created during rendering.
  function audioButton(target){const b=target?.closest?.('button,[role="button"]');return b&&!b.disabled&&b.getAttribute('aria-disabled')!=='true'&&!b.closest('[hidden],[inert]')?b:null;}
  document.addEventListener('click',event=>{const b=audioButton(event.target);if(b&&!['sound-button','picker-sound'].includes(b.id))sounds.play('click');},{capture:true});
  document.addEventListener('pointerover',event=>{if(event.pointerType==='touch')return;const b=audioButton(event.target);if(b&&!b.contains(event.relatedTarget))sounds.play('hover');});
  addEventListener('pagehide',()=>sounds.dispose(),{once:true});
  function syncSound(){for(const id of ['sound-button','picker-sound']){const button=$(id);button.setAttribute('aria-pressed',String(sound));button.setAttribute('aria-label',sound?'Tắt âm thanh':'Bật âm thanh');button.title=sound?'Tắt âm thanh':'Bật âm thanh';}}
  for(const id of ['sound-button','picker-sound'])$(id).addEventListener('click',()=>{sound=!sound;sounds.setEnabled(sound);syncSound();if(sound)sounds.play('click');});
  function resetToPicker(){
    sounds.stop();sounds.setMusic(true);victoryGame=null;lastBattle=null;
    islandBattleAbort?.abort();islandBattleAbort=null;busy=false;
    mapPreview=false;mapReturnLabel='';
    $('port-layer').hidden=true;$('stage').classList.remove('port-active','challenge-active');$('action-layer').classList.remove('island-challenge');$('challenge-island').hidden=true;$('map-viewport').inert=true;
    for(const id of ['routes','islands','island-scenes'])$(id).replaceChildren();paths.clear();nodes.clear();scenes.clear();mapIslands=[];mapLayout=null;
    $('ship-0').hidden=true;$('ship-1').hidden=true;syncMapCopies();loadingScreen(false);
    portUI.render(null,false);$('merchant-button').hidden=true;$('info-layer').hidden=true;game=null;viewResult=true;$('result').hidden=true;$('show-result').hidden=true;$('setup').hidden=false;$('stage').classList.remove('showing-result');$('stage').classList.add('preparing');$('action-layer').hidden=true;$('turn-banner').textContent='CHỌN LỚP · GIƯƠNG BUỒM';void loadClasses();
  }
  $('replay').addEventListener('click',resetToPicker);
  $('back-map').addEventListener('click',()=>{viewResult=false;render();});$('show-result').addEventListener('click',()=>{viewResult=true;render();});
  $('import-button').addEventListener('click',()=>$('question-file').click());
  $('question-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(file.size>1500000)throw new Error('File quá lớn. Tối đa 1,5 MB.');
      const data=JSON.parse((await file.text()).replace(/^\uFEFF/,''));
      readyBank(data,data.length+' câu hỏi từ '+file.name);$('import-error').hidden=true;await start();
    }catch(error){$('import-error').textContent=error.message;$('import-error').hidden=false;}
    event.target.value='';
  });
  $('sample-button').addEventListener('click',()=>{
    const blob=new Blob([JSON.stringify(window.TreasureQuestions,null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='dao-kho-bau-cau-hoi-mau.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  document.addEventListener('keydown',event=>{
    const layer=!$('info-layer').hidden?$('info-layer'):!$('port-layer').hidden?$('port-layer'):!$('action-layer').hidden?$('action-layer'):null;
    if(event.key==='Escape'&&!$('info-layer').hidden){closeInfo();event.preventDefault();return;}
    if(event.key==='Escape'&&portUI.closeMarketPreview()){render();$('merchant-button').focus({preventScroll:true});event.preventDefault();return;}
    if(event.key==='Escape'&&mapPreview){mapPreview=false;render();$('map-button').focus({preventScroll:true});event.preventDefault();return;}
    if(event.key==='Tab'&&layer){
      const scope=layer===$('port-layer')?[$('port-layer'),document.querySelector('.map-tools')]:[layer];
      const focusables=scope.flatMap(node=>[...node.querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')]).filter(el=>el.getClientRects().length&&!el.closest('[inert]'));
      if(!focusables.length)return;const first=focusables[0],last=focusables[focusables.length-1];
      const inside=scope.some(node=>node.contains(document.activeElement));
      if(event.shiftKey&&(document.activeElement===first||!inside)){last.focus();event.preventDefault();}
      else if(!event.shiftKey&&(document.activeElement===last||!inside)){first.focus();event.preventDefault();}
    }
  });
  async function prepareArtwork(generation){
    const files=[...new Set([...window.TreasureArtwork.files,...YARD.variants.filter(v=>v.hull===0).map(v=>v.file),...YARD.BASES.map(b=>b.harbor),...Object.values(TRADE.MERCHANTS).map(m=>m.image),'ui-tool-merchant.png','ui-upgrade-hull.png','ui-upgrade-provisions.png','result-backdrop.png','chest-open.png','chest-closed.png','captains-atlas.png','result-captains-atlas.png','ui-team-red.png','ui-team-blue.png','ui-title.png','ui-island-label.png','ui-action-green.png','ui-tools-atlas.png','ui-upgrade-icons.png','ui-upgrade-tab.png','ui-question-frame.png','ui-challenge-board-clean.png','ui-challenge-rocks.png','ui-challenge-barrel.png','ui-island-info.png','ui-buttons-atlas.png','ui-icons-atlas.png'])];
    let completed=0;$('stage').dataset.assetsReady='loading';$('game-progress').value=5;
    $('loading-status').textContent='Đang tải hình ảnh trò chơi…';
    const results=await Promise.all(files.map(async filename=>{
      const img=new Image();if(location.protocol!=='file:')img.crossOrigin='anonymous';img.src='assets/'+filename;
      let timer;
      try{await Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Image timeout')),30000);})]);return true;}
      catch{return false;}
      finally{
        clearTimeout(timer);completed++;
        if(generation===classGeneration){$('game-progress').value=5+Math.round(completed/files.length*90);$('loading-status').textContent='Đang tải hình ảnh trò chơi… '+completed+'/'+files.length;}
      }
    }));
    const loaded=results.every(Boolean);if(generation===classGeneration)$('stage').dataset.assetsReady=loaded?'true':'error';return loaded;
  }
  window.TreasureEffects.start($('ocean-motion'),reduced);syncSound();void loadClasses();
})();
