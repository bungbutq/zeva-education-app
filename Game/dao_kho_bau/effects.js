(function(root){
  'use strict';
  let liquids=[];
  function fitIslandCanvas(canvas,rect=canvas.getBoundingClientRect()){
    const scene=canvas.closest('.island-scene'),density=root.TreasureArtworkRenderer.density();
    // Keep the small-window quality floor, but follow actual screen pixels on
    // resize/zoom and Retina displays, up to the source artwork resolution.
    const width=Math.min(1536,Math.ceil(Math.max(parseFloat(scene.style.width)*2,rect.width*density)));
    const height=Math.min(1024,Math.ceil(Math.max(parseFloat(scene.style.height)*2,rect.height*density)));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
  }
  // Water masks follow the painted waterfall; vegetation and rock never enter these layers.
  const falls=[
    {path:'M573 211Q604 192 632 216L661 335Q637 349 605 337L590 256Z',box:[573,205,90,145],source:[601,242,32,77],speed:235},
    {path:'M667 208Q696 192 723 208Q747 244 754 338L696 345Q684 270 682 239Z',box:[665,203,92,147],source:[704,240,34,87],speed:270},
    {path:'M760 209Q779 202 791 217L817 337L782 341Q780 264 773 235Z',box:[758,207,61,138],source:[782,247,19,78],speed:245},
    {path:'M747 429Q847 418 970 433Q1000 465 1006 542L1038 697Q963 727 883 699L847 658L790 641L758 627Q762 510 747 429Z',box:[747,423,293,295],source:[889,474,88,164],speed:365}
  ].map(f=>({...f,clip:new Path2D(f.path)}));
  function bindIslands(container){
    root.TreasureArtworkRenderer.bind(container);
    root.TreasureAtmosphere.bind(container);
    root.TreasureLife.bind(container);
    liquids=(Array.isArray(container)?container:[container]).flatMap(c=>[...c.querySelectorAll('.island-liquid')]).map(canvas=>{
      const scene=canvas.closest('.island-scene'),ctx=canvas.getContext('2d');
      const paths=[...scene.querySelectorAll('.lava-flow path')].map(path=>{
        const length=path.getTotalLength(),points=[];
        for(let d=0;d<=length;d+=8){const p=path.getPointAtLength(d);points.push({x:p.x,y:p.y,d});}
        const p=path.getPointAtLength(length);points.push({x:p.x,y:p.y,d:length});return points;
      });
      fitIslandCanvas(canvas);
      return {canvas,ctx,image:scene.querySelector('img'),paths,kind:canvas.dataset.liquid};
    }).filter(item=>item.ctx);
  }
  function renderLiquids(t,now){
    for(const item of liquids){
      const {canvas,ctx,image,paths,kind}=item;if(!canvas.isConnected||!image.complete||!image.naturalWidth)continue;
      const rect=canvas.getBoundingClientRect();if(rect.right<0||rect.left>innerWidth||rect.bottom<0||rect.top>innerHeight)continue;
      fitIslandCanvas(canvas,rect);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/1536,0,0,canvas.height/1024,0,0);
      if(kind==='whale'){
        // Swim with a travelling body wave, strongest at the tail, using the actual sprite.
        const sw=image.naturalWidth,sh=image.naturalHeight;
        ctx.translate(107+Math.sin(t*.7)*88,123+Math.cos(t*.9)*18);ctx.scale(.86,.78);
        for(let x=0;x<sw;x+=12){
          const w=Math.min(12,sw-x),u=x/sw,dy=Math.sin(t*3-u*3.2)*(4+66*u*u*u);
          ctx.drawImage(image,x,0,w,sh,x*1536/sw,dy,w*1536/sw+.7,1024);
        }
        canvas.dataset.whaleCount='1';
        canvas.closest('.island-scene').dataset.animated='true';
      }else if(kind==='waterfall'){
        for(const [i,fall] of falls.entries()){
          const [x,y,w,h]=fall.box,[sx,sy,sw,sh]=fall.source,tile=sh*1.5,offset=(t*fall.speed+i*37)%tile;
          ctx.save();ctx.clip(fall.clip);ctx.globalAlpha=.76;
          // Advect real painted water texture down the stream, keeping the edges fixed.
          for(let dy=y-tile+offset;dy<y+h;dy+=tile){
            const sway=Math.sin(t*2.4+dy*.027+i)*3;
            ctx.drawImage(image,sx,sy,sw,sh,x-5+sway,dy,w+10,tile+1);
          }
          ctx.restore();
        }
      }else{
        ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#ff781b';ctx.shadowBlur=7;
        // A continuous molten current with travelling hot cores, without dashed light streaks.
        for(const [index,points] of paths.entries())for(let i=1;i<points.length;i++){
          const a=points[i-1],b=points[i],phase=b.d*.035-t*2.7+index*1.7;
          const heat=(Math.sin(phase)+Math.sin(phase*.47+1.2)+2)/4,eddy=Math.sin(b.d*.08-t*3.4)*3;
          ctx.strokeStyle='rgba(255,'+Math.round(75+heat*115)+',12,.85)';
          ctx.lineWidth=22+heat*12;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();
          ctx.shadowBlur=0;ctx.strokeStyle='rgba(255,238,'+Math.round(75+heat*100)+','+(.35+heat*.55)+')';ctx.lineWidth=6+heat*10;
          ctx.beginPath();ctx.moveTo(a.x+eddy,a.y);ctx.lineTo(b.x+eddy,b.y);ctx.stroke();
        }
        ctx.shadowBlur=0;
        if(!item.lavaMask){
          const mask=document.createElement('canvas');mask.width=768;mask.height=512;const c=mask.getContext('2d');c.drawImage(image,0,0,768,512);
          try{const pixels=c.getImageData(0,0,768,512),d=pixels.data;for(let i=0;i<d.length;i+=4){if(!(d[i]>185&&d[i+1]>48&&d[i+2]<d[i]*.58&&d[i]>d[i+1]*1.03))d[i+3]=0;}c.putImageData(pixels,0,0);item.lavaMask=mask;}catch{}
        }
        if(item.lavaMask){ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(item.lavaMask,0,0,1536,1024);ctx.restore();}
      }
      canvas.dataset.motionFrame=String(Math.round(now));
    }
  }
  // The challenge uses the map's ocean and clock; this adds only the contact
  // foam at its stationary wooden rail and separate foreground rocks.
  function renderChallengeSurf(stage,t,now){
    if(!stage.classList.contains('challenge-active'))return;
    const canvas=document.getElementById('challenge-surf'),ctx=canvas.getContext('2d');if(!ctx)return;
    const bounds=stage.getBoundingClientRect(),scale=bounds.width/1600,h=stage.clientHeight;
    if(bounds.width<=0||h<=0)return;
    const width=Math.ceil(bounds.width*(root.devicePixelRatio||1)),height=Math.ceil(width*h/1600);
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    ctx.setTransform(width/1600,0,0,height/h,0,0);ctx.clearRect(0,0,1600,h);
    const box=id=>{const r=document.getElementById(id).getBoundingClientRect();return {x:(r.left-bounds.left)/scale,y:(r.top-bounds.top)/scale,w:r.width/scale,h:r.height/scale};};
    const board=box('action-card'),rocks=box('challenge-rocks'),barrel=box('challenge-barrel');
    const railStart=rocks.x+rocks.w*.97,railEnd=barrel.x+barrel.w*.08;
    const shores=[
      {x:railStart,y:board.y+board.h*.963,w:railEnd-railStart,bend:2,rough:1,lift:10},
      {x:rocks.x+rocks.w*.03,y:rocks.y+rocks.h*.88,w:rocks.w*.91,bend:17,rough:3,lift:24},
      {x:barrel.x+barrel.w*.04,y:barrel.y+barrel.h*.88,w:barrel.w*.91,bend:16,rough:3,lift:22}
    ];
    // Stable variation belongs to decoration, never the game's random stream.
    const noise=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
    ctx.lineCap='round';ctx.lineJoin='round';
    for(const [index,shore] of shores.entries()){
      const edge=u=>shore.y+Math.sin(u*Math.PI)*shore.bend+Math.sin(u*29+index)*shore.rough;
      const cycle=(t/(3.5+index*.23)+index*.19)%1;
      const impact=cycle>.38&&cycle<.7?Math.sin((cycle-.38)/.32*Math.PI):0;
      const distance=cycle<.5?Math.pow(1-cycle/.5,1.7)*30:Math.pow((cycle-.5)/.5,.8)*24;
      const trace=(from,to,offset,ripple)=>{
        for(let j=0;j<=12;j++){
          const u=from+(to-from)*j/12,x=shore.x+u*shore.w;
          const y=edge(u)+offset+Math.sin(u*43-t*2)*ripple;
          j?ctx.lineTo(x,y):ctx.moveTo(x,y);
        }
      };
      // A translucent wash advances, curls against the edge and drains back.
      ctx.beginPath();trace(0,1,distance,1.5);ctx.lineTo(shore.x+shore.w,edge(1)+distance+17);
      for(let j=24;j>=0;j--){const u=j/24;ctx.lineTo(shore.x+u*shore.w,edge(u)+distance+17);}
      ctx.closePath();
      const wash=ctx.createLinearGradient(0,shore.y+distance-5,0,shore.y+distance+35);
      wash.addColorStop(0,'rgba(172,246,245,'+(.12+impact*.16)+')');wash.addColorStop(1,'rgba(25,162,197,0)');
      ctx.fillStyle=wash;ctx.fill();
      // Broken, tapered foam patches replace parallel lines and uniform spikes.
      const patches=Math.ceil(shore.w/19);
      for(let i=0;i<patches;i++){
        const seed=index*83+i,from=(i+noise(seed)*.28)/patches;
        const to=Math.min(1,from+(.35+noise(seed+17)*.56)/patches);
        const ripple=1+noise(seed+31)*1.5,fade=.18+impact*.58;
        ctx.beginPath();trace(from,to,distance-impact*3,ripple);
        ctx.strokeStyle='rgba(111,226,235,'+fade*.4+')';ctx.lineWidth=6+impact*6;ctx.stroke();
        ctx.strokeStyle='rgba(239,255,252,'+fade+')';ctx.lineWidth=1.2+noise(seed+9)*1.6+impact;ctx.stroke();
        const backwash=(cycle+.36)%1;
        ctx.beginPath();trace(from,to,6+backwash*22,2);
        ctx.strokeStyle='rgba(219,250,245,'+(1-backwash)*.24+')';ctx.lineWidth=1;ctx.stroke();
      }
      // A few separate collisions fan outward, with ballistic droplets falling
      // back into the water. The rail has a smaller splash than the rocks.
      for(let i=0;i<6;i++){
        const seed=index*47+i*7,u=(i+.2+noise(seed)*.6)/6;
        const p=(cycle-.39-noise(seed+1)*.1)/.29;if(p<=0||p>=1)continue;
        const x=shore.x+u*shore.w,y=edge(u),burst=Math.sin(p*Math.PI);
        for(let j=0;j<3;j++){
          const lean=(j-1)*7+(noise(seed+j+8)-.5)*6,rise=shore.lift*(.5+noise(seed+j+19)*.5);
          ctx.beginPath();ctx.moveTo(x-3,y+2);ctx.quadraticCurveTo(x+lean*.3,y-rise*burst,x+lean*burst,y-rise*burst*.55);
          ctx.strokeStyle='rgba(239,255,252,'+burst*.55+')';ctx.lineWidth=1.1;ctx.stroke();
          const flight=Math.min(1,p*1.3),dropX=x+lean*flight*1.8,dropY=y-4*rise*flight*(1-flight)+flight*6;
          ctx.fillStyle='rgba(249,255,253,'+(1-flight)*.8+')';ctx.beginPath();ctx.ellipse(dropX,dropY,.8+noise(seed+j)*.8,1.3,lean*.04,0,Math.PI*2);ctx.fill();
        }
      }
      for(let i=0;i<28;i++){
        const seed=index*73+i,u=noise(seed),p=(t*.27+noise(seed+6))%1;
        const x=shore.x+u*shore.w+Math.sin(t+seed)*3,y=edge(u)+4+p*24;
        ctx.fillStyle='rgba(231,255,249,'+Math.sin(p*Math.PI)*(.16+impact*.25)+')';ctx.beginPath();ctx.ellipse(x,y,1+noise(seed+11)*1.8,.7,0,0,Math.PI*2);ctx.fill();
      }
    }
    canvas.dataset.motionFrame=String(Math.round(now));
  }
  function start(canvas,reduced){
    const ctx=canvas.getContext('2d'),stage=canvas.parentElement,plate=new Image();if(!ctx)return;
    let frame=0,last=0,loaded=false;
    const tile=document.createElement('canvas');tile.width=1600;tile.height=948;
    const modulo=(x,n)=>(x%n+n)%n;
    // Decorative motion has its own deterministic phases, independent of game randomness.
    const crests=Array.from({length:138},(_,i)=>({x:45+(i*283%4710),y:30+(i*137%845),length:54+(i*19%108),phase:i*2.399,speed:.22+(i%5)*.04}));
    function paint(now){
      if(!loaded)return;
      const width=Math.min(2560,Math.ceil(stage.getBoundingClientRect().width*(root.devicePixelRatio||1))),height=Math.round(width*stage.clientHeight/1600);
      if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
      ctx.setTransform(width/1600,0,0,height/900,0,0);ctx.globalAlpha=1;
      const t=reduced.matches?0:now/1000,camera=Number(stage.dataset.cameraX)||0,offset=modulo(camera,1600);
      const oceanTime=t*.46;
      // Both texture and crest positions use world coordinates. Mirrored water
      // tiles join continuously, including when the camera circles 24 -> 1.
      if(reduced.matches){
        for(let x=-offset;x<1600;x+=1600)ctx.drawImage(tile,0,24,1600,900,x,0,1600,900);
      }else for(let y=0;y<900;y+=4){
        const dx=Math.sin(y*.033-oceanTime*1.3)*4+Math.sin(y*.016+oceanTime*.85)*2,dy=Math.sin(y*.021+oceanTime*1.2)*2;
        for(let x=-offset-1600+dx;x<1600;x+=1600)ctx.drawImage(tile,0,y+24+dy,1600,5,x,y,1600,5);
      }
      ctx.lineCap='round';
      for(const wave of crests){
        const phase=(oceanTime*wave.speed+wave.phase)%(Math.PI*2),opacity=Math.pow((Math.sin(phase)+1)/2,2)*.38;
        const x=modulo(wave.x-camera+Math.sin(phase)*29+200,4800)-200,y=wave.y+Math.cos(phase)*9;
        if(x< -200||x>1800)continue;
        const gradient=ctx.createLinearGradient(x-wave.length/2,0,x+wave.length/2,0);
        gradient.addColorStop(0,'#d8ffff00');gradient.addColorStop(.4,'#e5ffff');gradient.addColorStop(.65,'#caffff');gradient.addColorStop(1,'#d8ffff00');
        ctx.globalAlpha=opacity;ctx.strokeStyle=gradient;ctx.lineWidth=1.8+wave.y/450;
        ctx.beginPath();ctx.moveTo(x-wave.length/2,y+4);ctx.bezierCurveTo(x-wave.length/4,y-6,x+wave.length/5,y-6,x+wave.length/2,y+2);ctx.stroke();
        ctx.globalAlpha=opacity*.24;ctx.lineWidth=5;ctx.stroke();
      }
      canvas.dataset.cameraX=String(camera);canvas.dataset.motionFrame=String(Math.round(reduced.matches?0:now));
      renderChallengeSurf(stage,t,reduced.matches?0:now);
      renderLiquids(t,reduced.matches?0:now);
      root.TreasureLife.render(t);
      root.TreasureAtmosphere.render(t);
    }
    function draw(now){
      frame=0;if(reduced.matches||document.hidden||!loaded)return;
      frame=requestAnimationFrame(draw);if(now-last<33)return;last=now;paint(now);
    }
    function resume(){
      cancelAnimationFrame(frame);frame=0;
      if(reduced.matches){paint(0);return;}
      if(!document.hidden&&loaded)frame=requestAnimationFrame(draw);
    }
    plate.onload=()=>{
      const tc=tile.getContext('2d');tc.drawImage(plate,0,0,800,948);tc.save();tc.translate(1600,0);tc.scale(-1,1);tc.drawImage(plate,0,0,800,948);tc.restore();
      tc.fillStyle='rgba(3,30,83,.35)';tc.fillRect(0,0,tile.width,tile.height);
      loaded=true;resume();
    };plate.src='assets/ocean-water.png';
    stage.addEventListener('treasure:camera',()=>{root.TreasureArtworkRenderer.refresh();paint(performance.now());});
    addEventListener('resize',()=>paint(performance.now()));
    reduced.addEventListener('change',resume);document.addEventListener('visibilitychange',resume);addEventListener('pagehide',()=>cancelAnimationFrame(frame));
  }
  function renderIslands(t){root.TreasureArtworkRenderer.refresh();renderLiquids(t,t*1000);root.TreasureLife.render(t);root.TreasureAtmosphere.render(t);renderChallengeSurf(document.getElementById('stage'),t,t*1000);}
  function playIslandBattle({stage,ships,islands,label,reduced=false,signal}){
    const canvas=document.createElement('canvas');canvas.className='island-battle-fx';canvas.setAttribute('role','img');canvas.setAttribute('aria-label',label);stage.append(canvas);
    const ctx=canvas.getContext('2d'),duration=reduced?350:2800,start=performance.now();
    return new Promise(resolve=>{
      let raf=0,finished=false;
      const finish=()=>{if(finished)return;finished=true;cancelAnimationFrame(raf);clearTimeout(timer);removeEventListener('pagehide',finish);signal?.removeEventListener('abort',finish);canvas.remove();resolve();};
      // The timeout also completes encounters in a background tab with suspended animation frames.
      const timer=setTimeout(finish,duration+250);addEventListener('pagehide',finish,{once:true});
      signal?.addEventListener('abort',finish,{once:true});if(signal?.aborted){finish();return;}
      function center(nodes,rect){
        const visible=nodes.map(n=>n.getBoundingClientRect()).filter(r=>r.width&&r.right>rect.left&&r.left<rect.right).sort((a,b)=>Math.abs(a.x+a.width/2-(rect.x+rect.width/2))-Math.abs(b.x+b.width/2-(rect.x+rect.width/2)))[0];
        return visible?{x:(visible.x+visible.width/2-rect.x)*stage.clientWidth/rect.width,y:(visible.y+visible.height/2-rect.y)*stage.clientHeight/rect.height}:null;
      }
      function burst(x,y,size,rotation){
        ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.beginPath();
        for(let j=0;j<16;j++){const r=j%2?size*.42:size,angle=j*Math.PI/8;ctx.lineTo(Math.cos(angle)*r,Math.sin(angle)*r);}
        ctx.closePath();ctx.fillStyle='#ffe47a';ctx.strokeStyle='#9c4216';ctx.lineWidth=3;ctx.fill();ctx.stroke();ctx.restore();
      }
      function paint(now){
        if(finished)return;
        try{
          const elapsed=now-start;if(elapsed>=duration){finish();return;}
          const rect=stage.getBoundingClientRect(),w=stage.clientWidth,h=stage.clientHeight,scale=Math.min(2,rect.width/w*(devicePixelRatio||1));
          if(!rect.width){finish();return;}
          const width=Math.ceil(w*scale),height=Math.ceil(h*scale);if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
          ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,w,h);
          const a=center(ships(),rect),b=center(islands(),rect);if(!a||!b){finish();return;}
          const t=reduced?.7:elapsed/1000,c={x:(a.x+b.x)/2,y:(a.y+b.y)/2-12};
          ctx.globalAlpha=reduced?1:Math.min(1,elapsed/180,(duration-elapsed)/300);
          // A compact cartoon dust cloud, alternating cannonballs and small impact stars.
          for(let j=0;j<9;j++){
            const angle=j*Math.PI*2/9,shake=reduced?0:Math.sin(t*19+j)*5;
            const x=c.x+Math.cos(angle)*53+shake,y=c.y+Math.sin(angle)*35;
            const gradient=ctx.createRadialGradient(x-9,y-12,2,x,y,32);gradient.addColorStop(0,'#fffce2');gradient.addColorStop(1,'#a6b2a9');
            ctx.fillStyle=gradient;ctx.strokeStyle='#465d61';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y,28+Math.sin(j+t*8)*4,0,Math.PI*2);ctx.fill();ctx.stroke();
          }
          for(let j=0;j<4;j++){
            const phase=(t*2.8+j*.24)%1,from=j%2?a:b,to=j%2?b:a;
            const x=from.x+(to.x-from.x)*phase,y=from.y+(to.y-from.y)*phase-Math.sin(phase*Math.PI)*(65+j*14);
            ctx.strokeStyle='#fff2af';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-(to.x-from.x)*.13,y+14);ctx.lineTo(x,y);ctx.stroke();
            ctx.fillStyle='#263642';ctx.strokeStyle='#090f19';ctx.beginPath();ctx.arc(x,y,7,0,Math.PI*2);ctx.fill();ctx.stroke();
            if(phase>.65)burst(to.x+(j-2)*13,to.y-12,13+(1-phase)*24,t+j);
          }
          for(let j=0;j<3;j++){const angle=t*(j%2?3:-3)+j*2.1;burst(c.x+Math.cos(angle)*94,c.y+Math.sin(angle)*65,10+j*3,angle);}
          ctx.font='900 19px Nunito, sans-serif';ctx.textAlign='center';ctx.lineJoin='round';ctx.lineWidth=5;ctx.strokeStyle='#153e51';ctx.fillStyle='#fff5c4';ctx.strokeText('ĐANG GIAO CHIẾN',c.x,c.y+103);ctx.fillText('ĐANG GIAO CHIẾN',c.x,c.y+103);
          ctx.globalAlpha=1;raf=requestAnimationFrame(paint);
        }catch{finish();}
      }
      raf=requestAnimationFrame(paint);
    });
  }
  root.TreasureEffects=Object.freeze({start,bindIslands,renderIslands,fitIslandCanvas,playIslandBattle});
})(window);
