(function(root){
  'use strict';
  const files={crab:'sprite-giant-crab.png',fish:'sprite-mangrove-fish.png',guards:'sprite-guard-walk.png',villagers:'sprite-villagers-walk.png',birds:'sprite-totem-bird.png',snake:'sprite-snake-overhead.png',sharks:'sprite-shark-overhead.png',residents:'sprite-island-patrol.png',mermaids:'sprite-mermaid-poses-v2.png',monkeys:'sprite-monkey-climb.png',penguins:'sprite-penguin-walk.png'};
  const guardFrames=[[60,166,355,680],[468,166,286,680],[805,166,380,680],[1195,166,310,680]];
  const villagerFrames=[[[192,40,355,568],[736,40,374,568]],[[190,635,357,580],[736,635,378,580]]];
  const images=new Map();let scenes=[],lastTime=0;
  const clamp=(n,a=0,b=1)=>Math.max(a,Math.min(b,n)),ready=img=>img&&((img.complete&&img.naturalWidth)||img instanceof HTMLCanvasElement);
  function image(file){
    if(!images.has(file)){const img=new Image();if(root.location.protocol!=='file:')img.crossOrigin='anonymous';img.onload=()=>render(lastTime);img.src='assets/'+file;images.set(file,img);}
    return images.get(file);
  }
  function markup(kind){return '<canvas class="island-life" data-life="'+kind+'" aria-hidden="true"></canvas>';}
  function bind(containers){
    scenes=(Array.isArray(containers)?containers:[containers]).flatMap(c=>[...c.querySelectorAll('.island-life')]).map(canvas=>{
      const scene=canvas.closest('.island-scene'),ctx=canvas.getContext('2d'),kind=canvas.dataset.life;
      root.TreasureEffects.fitIslandCanvas(canvas);
      return {canvas,ctx,scene,kind,sprite:files[kind]?image(files[kind]):null,base:scene.querySelector('img'),cloud:kind==='storm'?image('island-26-storm.png'):null};
    });render(lastTime);
  }
  function crop(ctx,img,box,x,y,w,h,flip=false){
    if(!ready(img))return;ctx.save();ctx.translate(x,y);ctx.scale(flip?-1:1,1);ctx.drawImage(img,...box,-w/2,-h,w,h);ctx.restore();
  }
  function shadow(ctx,x,y,w,alpha=.18){
    ctx.save();ctx.translate(x,y);ctx.scale(1,.22);const g=ctx.createRadialGradient(0,0,0,0,0,w);
    g.addColorStop(0,'rgba(30,47,30,'+alpha+')');g.addColorStop(1,'rgba(30,47,30,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,w,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function ripple(ctx,x,y,w,alpha){
    ctx.save();ctx.strokeStyle='rgba(220,255,255,'+alpha+')';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(x,y,w,w*.15,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
  // Heading is continuous around the curve; no mirroring or width collapse.
  function swimmer(ctx,img,x,y,w,t,angle,amplitude=12,frequency=4,flatten=.58){
    if(!ready(img))return;
    ctx.save();ctx.translate(x,y);ctx.scale(1,flatten);ctx.rotate(angle);
    const sw=img.naturalWidth||img.width,sh=img.naturalHeight||img.height,scale=w/sw;
    for(let sx=0;sx<sw;sx+=12){
      const width=Math.min(12,sw-sx),u=sx/sw,dy=Math.sin(t*frequency-u*6.5)*amplitude*Math.pow(1-u,2);
      ctx.drawImage(img,sx,0,width,sh,-w/2+u*w,-sh*scale/2+dy,width*scale+.6,sh*scale);
    }
    ctx.restore();
  }
  const snakeRoute=[[1140,710],[1040,782],[800,804],[492,778],[365,695],[452,596],[730,553],[1050,602]];
  const routeTable=[];let routeLength=0;
  function catmull(u){
    const n=snakeRoute.length,segment=u*n,i=Math.floor(segment),f=segment-i;
    const points=[-1,0,1,2].map(j=>snakeRoute[(i+j+n)%n]);
    return [0,1].map(axis=>{const [a,b,c,d]=points.map(p=>p[axis]);return .5*((2*b)+(-a+c)*f+(2*a-5*b+4*c-d)*f*f+(-a+3*b-3*c+d)*f*f*f);});
  }
  for(let i=0;i<=400;i++){
    const p=catmull(i/400);if(i)routeLength+=Math.hypot(p[0]-routeTable[i-1].x,p[1]-routeTable[i-1].y);
    routeTable.push({x:p[0],y:p[1],distance:routeLength});
  }
  function routePoint(distance){
    const d=(distance%routeLength+routeLength)%routeLength;let low=0,high=routeTable.length-1;
    while(high-low>1){const m=(low+high)>>1;if(routeTable[m].distance<d)low=m;else high=m;}
    const a=routeTable[low],b=routeTable[high],f=(d-a.distance)/(b.distance-a.distance||1);
    return {x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f};
  }
  function snakeRig(item){
    if(item.rig)return item.rig;const img=item.sprite;if(!ready(img))return null;
    const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d');ctx.drawImage(img,0,0);
    let data;try{data=ctx.getImageData(0,0,c.width,c.height).data;}catch{return null;}
    const strips=[];
    for(let x=12;x<c.width-12;x+=8){
      let sum=0,weight=0,top=c.height,bottom=0;
      for(let y=0;y<c.height;y++){const a=data[(y*c.width+x)*4+3];if(a<120)continue;sum+=y*a;weight+=a;top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(weight&&bottom>top)strips.push({x,center:sum/weight,top:Math.max(0,top-3),height:bottom-top+7});
    }
    item.rig={strips,start:strips[0]?.x||0,end:strips.at(-1)?.x||c.width};return item.rig;
  }
  function constrainWater(item){
    const mask=root.TreasureAtmosphere.waterMask(item.base);if(!mask)return;
    item.ctx.save();item.ctx.globalCompositeOperation='destination-in';item.ctx.drawImage(mask,0,0,1536,1024);item.ctx.restore();
  }
  function fish(item,t){
    const {ctx,sprite:img}=item;
    // Two shoals stay inside the pools. The exact water alpha mask then hides
    // tails/heads behind the bridge, roots, stones, leaves and the sandy banks.
    ctx.save();ctx.beginPath();ctx.ellipse(965,583,153,120,0,0,Math.PI*2);ctx.ellipse(575,506,100,65,0,0,Math.PI*2);ctx.clip();
    for(let i=0;i<9;i++){
      const left=i>=6,p=t*(left?.25:.29)+(i%6)*.42,cx=left?575:958,cy=left?507:578,rx=left?47:100,ry=left?23:73;
      const x=cx+Math.cos(p)*rx+Math.sin(t*.9+i)*6,y=cy+Math.sin(p)*ry+Math.sin(t*1.1+i)*4;
      const heading=Math.atan2(Math.cos(p)*ry/.58,-Math.sin(p)*rx);
      ctx.save();ctx.globalAlpha=.63+.08*Math.sin(t*.4+i);swimmer(ctx,img,x,y,left?64:76+i%3*7,t+i,heading,4,9,.58);ctx.restore();
    }ctx.restore();constrainWater(item);
  }
  function crab(ctx,img,t){
    if(!ready(img))return;
    const phase=t*.43,x=768+Math.sin(phase)*235,y=794+Math.sin(phase*2)*12,pace=.35+.65*Math.abs(Math.cos(phase)),gait=t*8.5;
    shadow(ctx,x,y,270,.26);ctx.save();ctx.translate(x,y+63-Math.abs(Math.sin(gait))*4*pace);ctx.rotate(Math.sin(gait)*.008);
    const w=750,h=500,sx=w/img.naturalWidth,sy=h/img.naturalHeight;
    // Keep the shell anchored. Outer legs alternate; each claw swings around
    // its shoulder. Overlapping texture strips keep the joints continuous.
    for(let y0=0;y0<img.naturalHeight;y0+=32){
      const sh=Math.min(35,img.naturalHeight-y0),v=y0/img.naturalHeight;
      for(const [left,right,side] of [[0,390,-1],[390,770,-.32],[770,1150,.32],[1150,1536,1]]){
        const leg=clamp((v-.38)/.5),wave=Math.sin(gait+side*2.1+v*5)*pace,dx=wave*leg*11*Math.abs(side),dy=-Math.max(0,wave)*leg*13+Math.sin(t*2+side)*leg*3;
        ctx.drawImage(img,left,y0,right-left,sh,-w/2+left*sx+dx,-h+y0*sy+dy,(right-left)*sx+1,sh*sy+1);
      }
    }ctx.restore();
  }
  function walk(ctx,img,t,points,duration,offset,frames,h){
    if(!ready(img))return;
    const phase=(t/duration+offset)*Math.PI*2,u=(1-Math.cos(phase))/2,segment=u*(points.length-1),i=Math.min(points.length-2,Math.floor(segment)),f=segment-i;
    const a=points[i],b=points[i+1],x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;
    const travel=u*points.reduce((sum,p,j)=>j?sum+Math.hypot(p[0]-points[j-1][0],p[1]-points[j-1][1]):0,0);
    const gait=travel/23,frame=frames[Math.floor(gait)%frames.length],flip=(b[0]<a[0])!==(Math.sin(phase)<0),speed=Math.abs(Math.sin(phase)),bob=Math.abs(Math.sin(gait*Math.PI))*3*speed;
    shadow(ctx,x,y+2,h*.23,.22);ctx.save();ctx.translate(x,y-bob);ctx.scale(flip?-1:1,1);ctx.rotate(Math.sin(gait*Math.PI)*.012*speed);
    if(frames.length===2){
      const [sx,sy,sw,sh]=frame,w=sw/sh*h;
      for(let row=0;row<sh;row+=16){
        const rh=Math.min(18,sh-row),leg=clamp((row/sh-.65)/.35),stretch=1+Math.sin(gait*Math.PI)*leg*.13;
        ctx.drawImage(img,sx,sy+row,sw,rh,-w*stretch/2,-h+row/sh*h,w*stretch,rh/sh*h+.5);
      }
    }else crop(ctx,img,frame,0,0,frame[2]/frame[3]*h,h);
    ctx.restore();
  }
  function birds(ctx,img,t){
    if(!ready(img))return;
    for(let i=0;i<2;i++){
      const phase=(t+i*7)%18,perch=phase>=3.6&&phase<10.6,targetX=729+i*102,targetY=132;let x,y,alpha=1;
      if(phase<3.6){const u=phase/3.6,e=1-Math.pow(1-u,2);x=120+(targetX-120)*e;y=265+(targetY-265)*e-Math.sin(u*Math.PI)*70;alpha=clamp(u*5);}
      else if(perch){x=targetX;y=targetY;}
      else{const u=(phase-10.6)/7.4;x=targetX+u*640;y=targetY-u*45-Math.sin(u*Math.PI)*45;alpha=clamp(1-u*1.5);}
      ctx.save();ctx.globalAlpha=alpha;
      if(perch)crop(ctx,img,[1030,220,710,604],x,y,101,86+Math.sin(t*2.8+i)*1.1,Math.sin(t*.5+i)<-.75);
      else{
        ctx.translate(x,y);const flap=Math.sin(t*13+i),w=140,h=119;
        for(let row=0;row<720;row+=12){const rh=Math.min(14,720-row),v=row/720,wing=clamp((.65-v)/.65),dy=flap*wing*34;ctx.drawImage(img,30,60+row,870,rh,-w/2,-h+v*h+dy,w,rh/720*h+2);}
      }ctx.restore();
    }
  }
  function textureMasks(item){
    if(item.water||!ready(item.base)||!ready(item.cloud))return;
    const make=()=>{const c=document.createElement('canvas');c.width=768;c.height=512;return c;};
    const water=make(),cloud=make(),wc=water.getContext('2d'),cc=cloud.getContext('2d');
    wc.drawImage(item.base,0,0,768,512);cc.drawImage(item.cloud,0,0,768,512);
    try{
      const wp=wc.getImageData(0,0,768,512),cp=cc.getImageData(0,0,768,512),p=wp.data,q=cp.data;
      for(let k=0;k<p.length;k+=4){
        const y=Math.floor(k/4/768)*2;if(!(p[k+1]>p[k]*1.16&&p[k+2]>p[k]*1.08))p[k+3]=0;
        q[k+3]*=clamp((432-y)/48);if(y>235&&q[k]>140&&q[k+1]>185)q[k+3]=0;
      }
      wc.putImageData(wp,0,0);cc.putImageData(cp,0,0);item.water=water;item.cloudLayer=cloud;
    }catch(error){
      // A rejected cross-origin texture must not stop every map animation.
      if(error.name!=='SecurityError')throw error;item.water=water;item.cloudLayer=cloud;item.maskUnavailable=true;
    }
  }
  function storm(item,t){
    const {ctx}=item;textureMasks(item);if(!item.water)return;ctx.save();
    if(!item.maskUnavailable){
      ctx.globalAlpha=.9;
      for(let y=190;y<512;y+=5){const dx=Math.sin(y*.07-t*4.6)*11+Math.cos(y*.028+t*3)*6;ctx.drawImage(item.water,0,y,768,Math.min(6,512-y),dx*2,y*2,1536,12);}
      ctx.globalCompositeOperation='destination-in';ctx.drawImage(item.water,0,0,1536,1024);
    }ctx.restore();
    for(let i=0;i<7;i++){
      const p=(t*1.15+i*.53)%3;ctx.save();ctx.globalAlpha=(1-p/3)*.5;ctx.strokeStyle='#d8ffff';ctx.lineWidth=7-p;
      ctx.beginPath();ctx.ellipse(770,735,110+p*110,35+p*33,0,-t*1.2+i,-t*1.2+i+1.9);ctx.stroke();ctx.restore();
    }
    const cloudAlpha=Math.pow(Math.sin((t%11)/11*Math.PI),.6),funnel=Math.pow(Math.max(0,Math.sin(((t+1)%9)/9*Math.PI)),2);
    ctx.save();ctx.globalAlpha=cloudAlpha*funnel*.82;
    for(let i=0;i<23;i++){
      const z=((i/23+t*.55)%1),y=300+z*365,x=800+Math.sin(t*1.4-z*2.4)*37,r=(130*(1-z)+14)*funnel;
      ctx.strokeStyle=i%3?'#95bdcf':'#e0f6fb';ctx.lineWidth=6+(1-z)*9;ctx.beginPath();ctx.ellipse(x,y,r,9+z*5,0,t*6+z*9,t*6+z*9+4);ctx.stroke();
    }
    ctx.globalAlpha=cloudAlpha;
    if(!item.maskUnavailable)ctx.drawImage(item.cloudLayer,0,0,768,230,100+Math.sin(t*.6)*25,18,1336,400);
    else{ctx.fillStyle='#3a526bc9';ctx.beginPath();ctx.ellipse(768,210,480,110,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#d3faff';ctx.lineWidth=3;
    for(let i=0;i<31;i++){
      const p=(t*1.7+i*.618)%1,x=300+(i*113%980)-p*76,y=270+p*415;
      ctx.globalAlpha=cloudAlpha*Math.sin(p*Math.PI)*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-15,y+33);ctx.stroke();
    }ctx.restore();
    const pulse=t%3.7,flash=(pulse>.41&&pulse<.53)||(pulse>2.12&&pulse<2.23);
    if(flash&&cloudAlpha>.25){
      const x=pulse<1?535:1085;ctx.save();ctx.globalAlpha=cloudAlpha;ctx.strokeStyle='#efffff';ctx.shadowColor='#70dcff';ctx.shadowBlur=12;ctx.lineWidth=8;ctx.lineJoin='round';
      ctx.beginPath();ctx.moveTo(x,270);ctx.lineTo(x-65,365);ctx.lineTo(x+10,356);ctx.lineTo(x-48,500);ctx.stroke();
      ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(x-65,365);ctx.lineTo(x-108,405);ctx.lineTo(x-87,446);ctx.stroke();ctx.restore();
    }
  }
  function snake(item,t){
    const {ctx,sprite:img}=item,rig=snakeRig(item);if(!rig)return;
    const head=t*50+400,length=620;
    function body(u){
      const d=head-(1-u)*length,p=routePoint(d),a=routePoint(d-3),b=routePoint(d+3),angle=Math.atan2(b.y-a.y,b.x-a.x);
      const wave=Math.sin((1-u)*Math.PI*5-t*3.1)*19*Math.sin(u*Math.PI*.9);
      return {x:p.x-Math.sin(angle)*wave,y:p.y+Math.cos(angle)*wave*.64};
    }
    const span=rig.end-rig.start;
    // Each scale strip follows the same travelled path as the head, with a
    // lateral muscle wave. The animal keeps one continuous body and length.
    for(const strip of rig.strips){
      const u=(strip.x-rig.start)/span,p=body(u),next=body(Math.min(1,u+8/span)),prev=body(Math.max(0,u-8/span));
      const angle=Math.atan2(next.y-prev.y,next.x-prev.x),step=Math.max(2,Math.hypot(next.x-p.x,next.y-p.y)+1.5);
      ctx.save();ctx.translate(p.x,p.y+3);ctx.rotate(angle);ctx.fillStyle='#18351b26';ctx.fillRect(-1,-10,step+2,22);ctx.restore();
      ctx.save();ctx.translate(p.x,p.y);ctx.rotate(angle);
      ctx.drawImage(img,strip.x,strip.top,8,strip.height,-1,(strip.top-strip.center)*.42,step,strip.height*.42);
      ctx.restore();
    }
    // Foliage at the back of the circuit occludes the body naturally.
    if(!item.canopy&&item.base.complete){
      const mask=document.createElement('canvas');mask.width=768;mask.height=512;const c=mask.getContext('2d');c.drawImage(item.base,0,0,768,512);
      try{
        const pixels=c.getImageData(0,0,768,512),d=pixels.data;
        for(let k=0;k<d.length;k+=4){
          const x=k/4%768*2,y=Math.floor(k/4/768)*2,inside=Math.pow((x-770)/440,2)+Math.pow((y-495)/180,2)<1;
          const foliage=d[k+1]>d[k]*1.04&&d[k+1]>d[k+2]*1.2,stone=Math.abs(d[k]-d[k+2])<32&&Math.abs(d[k]-d[k+1])<26;
          if(!inside||(!foliage&&!stone))d[k+3]=0;
        }c.putImageData(pixels,0,0);item.canopy=mask;
      }catch{}
    }
    if(item.canopy){ctx.save();ctx.globalCompositeOperation='destination-out';ctx.drawImage(item.canopy,0,0,1536,1024);ctx.restore();}
  }
  function sharks(item,t){
    const {ctx,sprite:img}=item;
    ctx.save();ctx.beginPath();ctx.ellipse(768,697,650,240,0,0,Math.PI*2);ctx.clip();
    const actors=Array.from({length:3},(_,i)=>{
      const p=t*(.14+i*.012)+i*Math.PI*2/3,rx=380-i*26,ry=144-i*8;
      return {i,p,x:768+Math.cos(p)*rx,y:704+Math.sin(p)*ry,angle:Math.atan2(Math.cos(p)*ry/.58,-Math.sin(p)*rx),depth:(Math.sin(t*.33+i*2.4)+1)/2};
    }).sort((a,b)=>a.y-b.y);
    for(const {i,x,y,angle,depth} of actors){
      const size=.82+(y-560)/290*.18,w=(355+i*25)*size;
      ctx.save();ctx.globalAlpha=.13+Math.pow(depth,1.6)*.72;
      swimmer(ctx,img,x,y,w,t+i,angle,13,3.6,.58);ctx.restore();
      if(depth>.68){
        const a=(depth-.68)/.32,dx=Math.cos(angle),dy=Math.sin(angle)*.58;
        ctx.save();ctx.strokeStyle='rgba(225,255,255,'+a*.52+')';ctx.lineWidth=3;
        for(const side of [-1,1]){
          ctx.beginPath();ctx.moveTo(x+dx*w*.27-side*dy*13,y+dy*w*.27+side*dx*13);
          ctx.quadraticCurveTo(x-side*dy*34,y+side*dx*24,x-dx*w*.4-side*dy*46,y-dy*w*.4+side*dx*32);ctx.stroke();
        }ctx.restore();
      }
      if(depth<.3)for(let k=0;k<2;k++){
        const u=(t*.35+i*.31+k*.5)%1;ctx.strokeStyle='rgba(220,255,255,'+(1-u)*.3+')';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+18*k,y-u*42,2+u*4,0,Math.PI*2);ctx.stroke();
      }
    }ctx.restore();constrainWater(item);
  }
  function penguins(ctx,img,t){
    const frames=[[30,230,384,552],[431,218,350,564],[797,244,371,538],[1176,273,359,510]];
    walk(ctx,img,t,[[245,710],[325,725],[410,731]],15,.05,frames,155);
    walk(ctx,img,t,[[535,544],[610,557],[700,548]],18,.45,frames,142);
    walk(ctx,img,t,[[1175,762],[1250,779],[1315,766]],17,.7,frames,160);
  }
  function monkeys(ctx,img,t){
    if(!ready(img))return;
    const paths=[[[530,343],[482,300],[448,258],[498,224]],[[1275,480],[1286,423],[1324,380],[1370,357]]];
    const frames=[[8,115,377,728],[437,115,337,728],[822,115,333,728],[1202,115,332,728]];
    for(let actor=0;actor<2;actor++){
      const cycle=(t+actor*9)%19,u=cycle<7?cycle/7:cycle<10?1:cycle<17?1-(cycle-10)/7:0,moving=cycle<7||(cycle>=10&&cycle<17);
      const points=paths[actor],d=u*3,j=Math.min(2,Math.floor(d)),f=d-j,a=points[j],b=points[j+1],x=a[0]+(b[0]-a[0])*f,y=a[1]+(b[1]-a[1])*f;
      const frame=frames[moving?Math.floor(t*3.7+actor)%3:3],h=190-actor*6,w=frame[2]/frame[3]*h,rock=Math.sin(t*4+actor)*.035*(moving?1:.35);
      ctx.save();ctx.translate(x,y);ctx.rotate(rock);
      // Anchor the high hand to the branch; alternating hands/knees pull the
      // body up the trunk. Resting poses hold the branch at each end.
      ctx.drawImage(img,...frame,-w*.76,-h*.075,w,h);ctx.restore();
    }
  }
  function musicNotes(ctx,t){
    for(let i=0;i<9;i++){
      const p=(t*(.09+i%3*.008)+i*.197)%1,source=i%2?1132:541;
      const x=source+Math.sin(p*5+i)*35+p*(i%2?45:-45),y=485-p*270;
      ctx.save();ctx.globalAlpha=Math.min(1,p*7,(1-p)*5)*.95;ctx.translate(x,y);ctx.rotate(Math.sin(t*.9+i)*.12);ctx.scale(1.3+i%3*.2,1.3+i%3*.2);ctx.shadowColor='#294c7888';ctx.shadowBlur=3;
      ctx.fillStyle=i%2?'#fff3b7':'#e6ccff';ctx.strokeStyle=ctx.fillStyle;ctx.lineWidth=3.7;ctx.lineCap='round';
      ctx.beginPath();ctx.ellipse(-5,5,7,4.5,-.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(1,4);ctx.lineTo(1,-23);ctx.quadraticCurveTo(13,-16,9,-7);ctx.stroke();ctx.restore();
    }
  }
  function mermaids(item,t){
    const {ctx,sprite:img}=item;if(!ready(img))return;
    if(!item.swimSprite){const c=document.createElement('canvas');c.width=1066;c.height=440;c.getContext('2d').drawImage(img,470,200,1066,440,0,0,1066,440);item.swimSprite=c;}
    for(let i=0;i<2;i++){
      const p=t*(.18+i*.015)+i*2.7,cx=i?690:800,cy=i?777:537,rx=i?155:205,ry=i?60:100;
      const x=cx+Math.cos(p)*rx,y=cy+Math.sin(p)*ry,heading=Math.atan2(Math.cos(p)*ry/.62,-Math.sin(p)*rx);
      ctx.save();ctx.globalAlpha=.66+.16*Math.sin(t*.4+i);swimmer(ctx,item.swimSprite,x,y,320+i*20,t+i,heading,13,3,.68);ctx.restore();
      ripple(ctx,x-Math.cos(heading)*85,y-Math.sin(heading)*40,25+.5*Math.sin(t*3)*6,.12);
    }
    constrainWater(item);
    for(const [i,[x,y,scale]] of [[541,586,1],[1132,607,.88]].entries()){
      shadow(ctx,x,y+4,48,.16);
      const h=278*scale,w=454/1024*h;
      ctx.save();ctx.translate(x,y);
      for(let sy=0;sy<1024;sy+=16){
        const sh=Math.min(17,1024-sy),v=sy/1024,tail=Math.max(0,(v-.45)/.55),dx=Math.sin(t*1.5+i+v*4)*tail*3;
        ctx.drawImage(img,0,sy,454,sh,-w*.54+dx,-h*.395+v*h,w,sh/1024*h+.4);
      }ctx.restore();
    }
    musicNotes(ctx,t);
  }

  function render(t){
    lastTime=t;
    for(const item of scenes){
      const {canvas,ctx,scene,kind,sprite:img}=item;if(!canvas.isConnected||!ctx)continue;
      const rect=canvas.getBoundingClientRect();if(rect.right< -100||rect.left>innerWidth+100||rect.bottom<0||rect.top>innerHeight)continue;
      root.TreasureEffects.fitIslandCanvas(canvas,rect);
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/1536,0,0,canvas.height/1024,0,0);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      if(kind==='crab')crab(ctx,img,t);
      else if(kind==='fish')fish(item,t);
      else if(kind==='guards'){
        walk(ctx,img,t,[[480,780],[665,755],[810,778]],19,0,guardFrames,180);
        walk(ctx,img,t,[[885,787],[1040,837],[1150,800]],23,.6,guardFrames,174);
      }else if(kind==='villagers'){
        walk(ctx,img,t,[[570,665],[710,690],[840,735]],22,0,villagerFrames[0],165);
        walk(ctx,img,t,[[860,738],[1010,730],[1120,665]],25,.6,villagerFrames[1],158);
        walk(ctx,img,t,[[310,660],[420,707],[565,744]],27,.3,villagerFrames[0],153);
      }else if(kind==='residents'){
        const spear=Array.from({length:4},(_,i)=>[i*384+40,8,330,494]),bow=Array.from({length:4},(_,i)=>[i*384+40,520,330,486]);
        walk(ctx,img,t,[[720,570],[835,608],[950,614],[1035,585]],26,.1,spear,164);
        walk(ctx,img,t,[[380,728],[496,710],[610,709]],23,.6,bow,156);
        walk(ctx,img,t,[[1070,755],[1160,771],[1240,736]],28,.3,spear,153);
      }else if(kind==='birds')birds(ctx,img,t);
      else if(kind==='snake')snake(item,t);
      else if(kind==='sharks')sharks(item,t);
      else if(kind==='storm')storm(item,t);
      else if(kind==='penguins')penguins(ctx,img,t);
      else if(kind==='mermaids')mermaids(item,t);
      else if(kind==='monkeys')monkeys(ctx,img,t);
      canvas.dataset.motionFrame=String(Math.round(t*1000));scene.dataset.liveEffect=kind;
    }
  }
  root.TreasureLife=Object.freeze({markup,bind,render});
})(window);
