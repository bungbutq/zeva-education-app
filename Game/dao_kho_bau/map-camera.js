(function(root){
  'use strict';
  function create({viewport,reduced,canPan}){
    const width=1600,worldWidth=4800,world=document.getElementById('map-world'),stage=document.getElementById('stage');
    const track=document.createElement('div');track.id='map-track';viewport.append(track);track.append(world);world.style.left=width+'px';
    // Closed, inert seam previews stay outside gameplay, focus and ID lookups.
    const echoes=[0,6400].map((left,index)=>{
      const host=document.createElement('div');host.className='map-echo';host.style.left=left+'px';host.inert=true;host.setAttribute('aria-hidden','true');track.append(host);
      const shadow=host.attachShadow({mode:'closed'});
      for(const style of document.head.querySelectorAll('style,link[rel="stylesheet"]'))shadow.append(style.cloneNode(true));
      return {shadow,index,copy:null};
    });
    let drag=null,suppressUntil=0,wheelTimer=0,settleTimer=0,pendingTarget=null;
    const modulo=(x,n)=>(x%n+n)%n;
    function syncWorld(){
      for(const echo of echoes){
        const copy=world.cloneNode(true);copy.style.left=echo.index===0?'-3200px':'0px';
        for(const n of copy.querySelectorAll('.island,.island-scene')){
          const id=Number(n.dataset.id);if(echo.index===0?id<=16:id>8)n.remove();
        }
        copy.querySelectorAll('.map-snap').forEach(n=>n.remove());
        if(echo.copy)echo.copy.replaceWith(copy);else echo.shadow.append(copy);echo.copy=copy;
      }
    }
    function update(){
      const page=modulo(Math.round(viewport.scrollLeft/width)-1,3);
      viewport.dataset.page=String(page);
      stage.dataset.cameraX=String(viewport.scrollLeft-width);
      stage.dispatchEvent(new Event('treasure:camera'));
    }
    function normalize(){
      if(drag)return;
      const x=viewport.scrollLeft;
      if(pendingTarget!==null&&Math.abs(x-pendingTarget)>1)return;
      pendingTarget=null;
      if(x<width/2)viewport.scrollTo({left:x+worldWidth,behavior:'instant'});
      else if(x>worldWidth+width/2)viewport.scrollTo({left:x-worldWidth,behavior:'instant'});
      update();
    }
    function panTo(x,instant=false){
      pendingTarget=Math.max(0,Math.min(6400,x));
      viewport.scrollTo({left:pendingTarget,behavior:instant||reduced.matches?'instant':'smooth'});
      if(instant||reduced.matches)normalize();update();
    }
    function pageBy(step){normalize();panTo((Math.round((pendingTarget===null?viewport.scrollLeft:pendingTarget)/width)+step)*width);}
    function show(x,instant=false){
      const target=(Math.floor(modulo(x,worldWidth)/width)+1)*width;
      const candidates=[target-worldWidth,target,target+worldWidth].filter(n=>n>=0&&n<=6400);
      candidates.sort((a,b)=>Math.abs(a-viewport.scrollLeft)-Math.abs(b-viewport.scrollLeft));panTo(candidates[0],instant);
    }
    viewport.addEventListener('scroll',()=>{update();clearTimeout(settleTimer);settleTimer=setTimeout(normalize,160);},{passive:true});
    viewport.addEventListener('scrollend',normalize);
    viewport.addEventListener('pointerdown',event=>{
      if(!canPan()||event.button!==0)return;
      pendingTarget=null;normalize();drag={id:event.pointerId,x:event.clientX,left:viewport.scrollLeft,moved:false};
    });
    viewport.addEventListener('pointermove',event=>{
      if(!drag||event.pointerId!==drag.id)return;
      const scale=viewport.getBoundingClientRect().width/width,delta=(drag.x-event.clientX)/scale;
      if(!drag.moved&&Math.abs(delta)<7)return;
      if(!drag.moved){drag.moved=true;viewport.classList.add('dragging');viewport.setPointerCapture(event.pointerId);}
      event.preventDefault();viewport.scrollLeft=Math.max(0,Math.min(6400,drag.left+delta));
    });
    function end(event){
      if(!drag||event.pointerId!==drag.id)return;
      const finished=drag;drag=null;
      if(finished.moved){
        suppressUntil=performance.now()+350;const delta=viewport.scrollLeft-finished.left;
        const target=Math.abs(delta)>100?Math.round(finished.left/width)+Math.sign(delta):Math.round(viewport.scrollLeft/width);
        viewport.classList.remove('dragging');panTo(target*width);
      }
    }
    viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);
    viewport.addEventListener('click',event=>{if(performance.now()<suppressUntil){event.preventDefault();event.stopImmediatePropagation();}},true);
    viewport.addEventListener('wheel',event=>{
      if(!canPan()||event.ctrlKey)return;event.preventDefault();
      pendingTarget=null;
      const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
      viewport.classList.add('dragging');viewport.scrollLeft=Math.max(0,Math.min(6400,viewport.scrollLeft+delta));clearTimeout(wheelTimer);
      wheelTimer=setTimeout(()=>{viewport.classList.remove('dragging');panTo(Math.round(viewport.scrollLeft/width)*width);},140);
    },{passive:false});
    viewport.addEventListener('keydown',event=>{if(canPan()&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();pageBy(event.key==='ArrowLeft'?-1:1);}});
    panTo(width,true);
    return {reset:()=>panTo(width,true),show,pageBy,syncWorld,
      containers:()=>[world,...echoes.map(e=>e.copy).filter(Boolean)],
      ships:id=>[document.getElementById('ship-'+id),...echoes.map(e=>e.copy&&e.copy.querySelector('#ship-'+id)).filter(Boolean)]};
  }
  root.TreasureMapCamera=Object.freeze({create});
})(window);
