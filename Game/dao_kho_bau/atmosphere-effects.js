(function(root){
  'use strict';
  const kinds=['fog','reef','snow','fruit','sakura','tribal','coral','lighthouse','crystal','spores','dragon-smoke','thunder'],waterMasks=new WeakMap();
  let scenes=[],mistTexture;
  const clamp=n=>Math.max(0,Math.min(1,n)),mod=(n,d)=>(n%d+d)%d;
  const falls={
    fruit:[
      {path:'M794 388Q827 390 844 414L868 614L823 620L818 455Z',box:[793,388,78,235],source:[826,439,24,140],speed:235},
      {path:'M908 435Q973 427 1001 462Q1041 525 1057 703L1044 729L940 727Q957 565 937 499Z',box:[909,434,150,299],source:[961,501,64,170],speed:330}
    ],
    sakura:[
      {path:'M728 390L760 390Q737 416 734 490L686 500Q687 430 703 410Z',box:[683,390,78,114],source:[699,433,25,58],speed:190},
      {path:'M656 532Q701 548 746 536L751 582L670 583Z',box:[656,532,97,52],source:[682,548,45,29],speed:180},
      {path:'M733 698Q774 703 804 697L827 793Q783 810 741 794Z',box:[731,695,97,113],source:[758,727,45,62],speed:230}
    ],
    tribal:[
      {path:'M730 420L795 414Q778 446 775 497L706 505Q706 444 718 430Z',box:[704,414,91,94],source:[718,444,47,49],speed:205},
      {path:'M742 510Q792 512 810 538L825 577L769 565L751 540Z',box:[740,509,88,71],source:[771,536,33,34],speed:205},
      {path:'M744 622L823 632L838 653Q791 675 749 656Z',box:[742,621,98,54],source:[764,633,44,24],speed:220}
    ]
  };
  for(const list of Object.values(falls))for(const f of list)f.clip=new Path2D(f.path);
  function markup(kind){return '<canvas class="island-ambient" data-ambient="'+kind+'" aria-hidden="true"></canvas>';}
  function waterMask(base){
    if(waterMasks.has(base))return waterMasks.get(base);
    if(!base||!base.complete||!base.naturalWidth)return null;
    const canvas=document.createElement('canvas');canvas.width=768;canvas.height=512;const ctx=canvas.getContext('2d');
    ctx.drawImage(base,0,0,768,512);
    try{
      const pixels=ctx.getImageData(0,0,768,512),d=pixels.data;
      for(let i=0;i<d.length;i+=4){
        const cyan=d[i+1]>d[i]*1.14&&d[i+2]>d[i]*1.12&&d[i+1]>60&&d[i+2]>60;
        d[i+3]=cyan?d[i+3]:0;
      }
      ctx.putImageData(pixels,0,0);waterMasks.set(base,canvas);return canvas;
    }catch(error){if(error.name!=='SecurityError')throw error;waterMasks.set(base,null);return null;}
  }
  function bind(containers){
    scenes=(Array.isArray(containers)?containers:[containers]).flatMap(c=>[...c.querySelectorAll('.island-ambient')]).map(canvas=>{
      const scene=canvas.closest('.island-scene');
      root.TreasureEffects.fitIslandCanvas(canvas);
      return {canvas,scene,ctx:canvas.getContext('2d'),kind:canvas.dataset.ambient,base:scene.querySelector('img')};
    });
  }
  function waterFinish(ctx,base){
    const mask=waterMask(base);if(!mask)return;
    ctx.save();ctx.globalCompositeOperation='destination-in';ctx.drawImage(mask,0,0,1536,1024);ctx.restore();
  }
  function flow(item,t){
    const {ctx,base,kind}=item;if(!base.complete||!base.naturalWidth)return;
    for(const [i,f] of (falls[kind]||[]).entries()){
      const [x,y,w,h]=f.box,[sx,sy,sw,sh]=f.source,tile=sh*1.45,offset=mod(t*f.speed+i*37,tile);
      ctx.save();ctx.clip(f.clip);ctx.globalAlpha=.78;
      for(let dy=y-tile+offset;dy<y+h;dy+=tile)ctx.drawImage(base,sx,sy,sw,sh,x-3+Math.sin(t*2.2+dy*.02)*2,dy,w+6,tile+1);
      ctx.restore();
    }
    // The photograph-derived mask excludes both bridges and their railings,
    // even where a waterfall continues behind them.
    waterFinish(ctx,base);
    for(const [i,f] of (falls[kind]||[]).entries()){
      const [x,y,w,h]=f.box,cx=x+w*.6,cy=y+h;
      ctx.save();ctx.globalAlpha=.15+.07*Math.sin(t*2+i);
      const g=ctx.createRadialGradient(cx,cy,1,cx,cy,w*.55);g.addColorStop(0,'#ecffff');g.addColorStop(1,'#d1ffff00');
      ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(cx,cy,w*.55,w*.19,0,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  function hash(x,y){let a=Math.imul(x,374761393)+Math.imul(y,668265263);a=Math.imul(a^(a>>>13),1274126177);return ((a^(a>>>16))>>>0)/4294967295;}
  function noise(x,y){
    const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,s=fx*fx*(3-2*fx),t=fy*fy*(3-2*fy);
    return (hash(i,j)*(1-s)+hash(i+1,j)*s)*(1-t)+(hash(i,j+1)*(1-s)+hash(i+1,j+1)*s)*t;
  }
  function fogTexture(){
    if(mistTexture)return mistTexture;
    const c=document.createElement('canvas');c.width=256;c.height=128;const ctx=c.getContext('2d'),pixels=ctx.createImageData(256,128);
    for(let y=0;y<128;y++)for(let x=0;x<256;x++){
      const n=noise(x/42,y/24)*.55+noise(x/19,y/12)*.28+noise(x/8,y/6)*.17;
      const edge=Math.pow(Math.max(0,1-Math.pow((x-128)/128,2)-Math.pow((y-64)/64,2)),1.5),i=(y*256+x)*4;
      pixels.data[i]=224;pixels.data[i+1]=244;pixels.data[i+2]=248;pixels.data[i+3]=clamp((n-.15)*2.2)*edge*255;
    }ctx.putImageData(pixels,0,0);mistTexture=c;return c;
  }
  function fog(ctx,t){
    const tex=fogTexture();
    // Broad overlapping banks at different heights, each gathering and
    // dispersing independently. Offset phases keep mist on the island.
    for(let i=0;i<18;i++){
      const tier=i%5,x=510+(i%3)*255+Math.sin(t*(.08+i%3*.018)+i*1.9)*290;
      const y=165+tier*145+Math.sin(t*.17+i*2.3)*48,w=1030+i%4*125,h=330+i%3*85;
      const breath=(Math.sin(t*(.27+i%4*.019)+i*1.45)+1)/2;
      ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*.1+i)*.075);ctx.globalAlpha=.28+breath*.7;ctx.drawImage(tex,-w/2,-h/2,w,h);ctx.restore();
    }
    ctx.save();ctx.globalCompositeOperation='destination-in';ctx.translate(768,512);ctx.scale(768,512);
    const edge=ctx.createRadialGradient(0,0,.58,0,0,1);edge.addColorStop(0,'#ffffff');edge.addColorStop(1,'#ffffff00');ctx.fillStyle=edge;ctx.fillRect(-1,-1,2,2);ctx.restore();
  }
  function reef(item,t){
    const {ctx,base}=item,mask=waterMask(base);if(!mask)return;
    ctx.save();ctx.globalAlpha=.48;
    for(let y=450;y<1024;y+=12){
      const dy=Math.sin(t*1.5+y*.013)*4,dx=Math.sin(t*.9+y*.023)*5;
      ctx.drawImage(mask,0,y/2,768,Math.min(7,(1024-y)/2),dx,y+dy,1536,14);
    }ctx.restore();waterFinish(ctx,base);
    const contacts=[[460,551,170],[925,620,220],[620,836,220],[1262,720,125],[225,680,115]];
    for(const [i,[x,y,r]] of contacts.entries()){
      const p=mod(t*.25+i*.197,1),approach=clamp(p/.62),a=Math.sin(approach*Math.PI*.8)*.7*(1-clamp((p-.7)/.3));
      ctx.save();ctx.strokeStyle='rgba(226,255,255,'+a+')';ctx.lineWidth=5+approach*3;
      ctx.beginPath();ctx.ellipse(x,y+52*(1-approach),r*(1.2-approach*.2),r*.2,0,.06,Math.PI-.06);ctx.stroke();ctx.restore();
    }
    waterFinish(ctx,base);
    // Foam breaks at the actual feet of each rock, with short spray arcs.
    for(const [i,[x,y,r]] of contacts.entries()){
      const p=mod(t*.25+i*.197,1),s=clamp((p-.53)/.47);if(!s)continue;
      ctx.save();ctx.globalAlpha=Math.sin(s*Math.PI)*.78;ctx.strokeStyle='#efffff';ctx.fillStyle='#efffff';ctx.lineCap='round';ctx.lineWidth=4;
      for(let k=0;k<9;k++){
        const angle=.25+k/8*(Math.PI-.5),px=x+Math.cos(angle)*r*.9,py=y+Math.sin(angle)*r*.13;
        ctx.beginPath();ctx.ellipse(px,py,10+s*18,3+s*2,0,0,Math.PI);ctx.stroke();
        const rise=Math.sin(s*Math.PI)*(12+hash(i,k)*26);ctx.beginPath();ctx.arc(px+(k-4)*s*3,py-rise,2+hash(k,i)*3,0,Math.PI*2);ctx.fill();
      }ctx.restore();
    }
  }
  function snow(ctx,t){
    for(let i=0;i<220;i++){
      const depth=.55+(i%7)/9,p=mod(t*(.045+depth*.023)+i*.618,1),x=50+hash(i,8)*1370+Math.sin(t*.5+i)*32+p*65,y=25+p*930;
      const alpha=clamp(p*8)*clamp((1-p)*7)*(.5+depth*.36),r=(4.5+hash(i,3)*6.5)*depth;
      ctx.save();ctx.globalAlpha=alpha;ctx.translate(x,y);ctx.rotate(t*.4+i);ctx.fillStyle='#f4fcff';
      if(i%4===0){ctx.strokeStyle='#f6fdff';ctx.lineWidth=2;ctx.beginPath();for(let arm=0;arm<6;arm++){const a=arm*Math.PI/3;ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);}ctx.stroke();}
      else{ctx.beginPath();ctx.ellipse(0,0,r,r*.82,0,0,Math.PI*2);ctx.fill();}ctx.restore();
    }
  }
  function petals(ctx,t){
    for(let i=0;i<34;i++){
      const p=mod(t*(.035+hash(i,1)*.025)+i*.618,1),x=400+hash(i,5)*720+p*110+Math.sin(p*7+i)*50,y=110+hash(i,2)*240+p*560;
      ctx.save();ctx.globalAlpha=clamp(p*8)*clamp((1-p)*6)*.9;ctx.translate(x,y);ctx.rotate(t*(.6+hash(i,3))+i);ctx.scale(.35+.65*Math.abs(Math.cos(t*1.7+i)),1);
      ctx.fillStyle=i%3?'#ffacd7':'#fff0f7';ctx.beginPath();ctx.moveTo(0,-9);ctx.bezierCurveTo(11,-8,12,5,0,10);ctx.bezierCurveTo(-11,2,-9,-6,0,-9);ctx.fill();ctx.restore();
    }
  }
  function coral(item,t){
    const {ctx,base}=item;
    if(!item.glints&&base.complete&&base.naturalWidth){
      const c=document.createElement('canvas');c.width=192;c.height=128;const cc=c.getContext('2d');cc.drawImage(base,0,0,192,128);
      try{
        const d=cc.getImageData(0,0,192,128).data,points=[];
        for(let y=65;y<115;y++)for(let x=15;x<180;x++){const k=(y*192+x)*4;if(d[k+3]>150&&d[k]>145&&d[k]>d[k+1]*1.18)points.push([x*8,y*8]);}
        item.glints=Array.from({length:24},(_,i)=>points[Math.floor(hash(i,7)*points.length)]).filter(Boolean);
      }catch{item.glints=[[500,700],[900,760],[760,640],[1030,690]];}
    }
    for(const [i,[x,y]] of (item.glints||[]).entries()){
      const a=Math.pow((Math.sin(t*(1.2+i%3*.17)+i*2.4)+1)/2,7),r=7+hash(i,1)*8;
      ctx.save();ctx.globalAlpha=a*.85;ctx.translate(x,y);ctx.rotate(Math.sin(t*.6+i)*.2);ctx.strokeStyle=i%2?'#fff9d0':'#bffffa';ctx.lineWidth=2;
      ctx.shadowColor='#d2fff7';ctx.shadowBlur=5;ctx.beginPath();ctx.moveTo(-r,0);ctx.quadraticCurveTo(0,-1,r,0);ctx.moveTo(0,-r);ctx.quadraticCurveTo(1,0,0,r);ctx.stroke();ctx.restore();
    }
  }
  function halo(ctx,x,y,r,color,alpha){
    ctx.save();ctx.globalAlpha=alpha;const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.2,color);g.addColorStop(1,color+'00');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  function lighthouse(ctx,t){
    const angle=t*.46,origin=[810,227];
    for(const opposite of [0,Math.PI]){
      const a=angle+opposite,dx=Math.cos(a),dy=Math.sin(a)*.32,front=(Math.sin(a)+1)/2;
      ctx.save();ctx.translate(...origin);
      const length=660,width=135,gradient=ctx.createLinearGradient(0,0,dx*length,dy*length);
      gradient.addColorStop(0,'#fffef2');gradient.addColorStop(.18,'#fff4bfe0');gradient.addColorStop(.65,'#fff6c360');gradient.addColorStop(1,'#fff9da00');ctx.fillStyle=gradient;
      // Nested feathered cones avoid a hard triangular cutout.
      for(let i=0;i<8;i++){
        const spread=width*(1-i*.085);ctx.globalAlpha=(.12+front*.2);
        ctx.beginPath();ctx.moveTo(-dy*5,dx*5);ctx.lineTo(dx*length-dy*spread,dy*length+dx*spread*.6);
        ctx.quadraticCurveTo(dx*(length+40),dy*(length+40),dx*length+dy*spread,dy*length-dx*spread*.6);ctx.lineTo(dy*5,-dx*5);ctx.closePath();ctx.fill();
      }ctx.restore();
    }
    halo(ctx,810,227,34,'#fff6b6',.65+.3*Math.pow(Math.max(0,Math.sin(angle)),8));
    ctx.save();ctx.fillStyle='#fffdeb';ctx.beginPath();ctx.ellipse(810+Math.cos(angle)*27,227,7+Math.abs(Math.sin(angle))*7,15,0,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  const crystalFaces=[
    [[797,35],[815,114],[858,238],[769,167]],
    [[692,156],[738,208],[748,333],[713,283]],
    [[965,159],[995,223],[965,284],[946,227]],
    [[714,406],[732,442],[722,492],[702,464]],
    [[603,520],[625,566],[613,625],[594,579]],
    [[1013,470],[1048,530],[1043,624],[1004,579]],
    [[1051,330],[1070,389],[1049,421],[1036,373]],
    [[1086,568],[1104,609],[1080,655],[1069,625]],
    [[422,696],[441,735],[426,771],[414,742]],
    [[951,735],[974,774],[960,805],[941,776]]
  ];
  function crystal(ctx,t){
    for(const [i,face] of crystalFaces.entries()){
      const p=mod(t*.28+i*.137,1),a=Math.pow(Math.sin(p*Math.PI),5),xs=face.map(p=>p[0]),ys=face.map(p=>p[1]),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
      ctx.save();ctx.beginPath();face.forEach(([x,y],j)=>j?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.clip();
      const sy=y-h*.7+p*h*2.4,g=ctx.createLinearGradient(x,sy,x+w,sy+h*.5);g.addColorStop(0,'#e9ffff00');g.addColorStop(.5,'#ffffff');g.addColorStop(1,'#ffc8ff00');
      ctx.globalAlpha=.2+a*.8;ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore();
      const [gx,gy]=face[0];halo(ctx,gx,gy,48,'#e6ffff',a*.9);
      ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#fffef4';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(gx-27,gy);ctx.lineTo(gx+27,gy);ctx.moveTo(gx,gy-38);ctx.lineTo(gx,gy+38);ctx.stroke();ctx.restore();
    }
  }
  function spores(ctx,t){
    for(let i=0;i<65;i++){
      const p=mod(t*(.027+hash(i,4)*.027)+i*.618,1),x=190+hash(i,7)*1150+Math.sin(p*5+i)*60,y=850-p*720+Math.sin(t*.5+i)*16;
      const r=5+hash(i,3)*14,a=clamp(p*8)*clamp((1-p)*6)*(.65+.3*Math.sin(t*1.2+i)**2);
      halo(ctx,x,y,r*3,i%3?'#fff3a8':'#c5fff3',a*.43);
      ctx.save();ctx.globalAlpha=a;ctx.fillStyle=i%3?'#fff7c6':'#e2fff9';ctx.beginPath();ctx.arc(x,y,r*.55,0,Math.PI*2);ctx.fill();ctx.restore();
    }
  }
  function dragonSmoke(ctx,t){
    const tex=fogTexture();
    // A breath leaves the mouth horizontally, spreads into several lobes,
    // then curls sideways in the crosswind instead of rising as a chimney.
    for(let i=0;i<36;i++){
      const p=mod(t*.19+i/36,1),branch=i%4,angle=-.65+branch*.48;
      const x=982+Math.sin(p*Math.PI*.73)*300+Math.cos(t*.34+branch)*p*60;
      const y=306+Math.sin(angle)*p*235+Math.sin(p*5+branch)*p*48;
      const w=55+p*310,h=45+p*190,emission=t-p/.19;
      const breath=.35+.65*Math.max(0,Math.sin(emission*.8));
      const a=clamp(p*14)*Math.pow(1-p,1.5)*breath*.85;
      ctx.save();ctx.globalAlpha=a;ctx.translate(x,y);ctx.rotate(angle+Math.sin(p*4+branch)*.2);ctx.drawImage(tex,-w/2,-h/2,w,h);ctx.restore();
    }
  }
  let cloudTexture;
  function thunder(ctx,t){
    if(!cloudTexture){const tex=fogTexture();cloudTexture=document.createElement('canvas');cloudTexture.width=256;cloudTexture.height=128;const c=cloudTexture.getContext('2d');c.drawImage(tex,0,0);c.globalCompositeOperation='source-in';c.fillStyle='#3b5067';c.fillRect(0,0,256,128);}
    const positions=[[515,195,640,430],[815,100,790,300],[1110,238,1000,530],[430,380,560,640],[1055,405,1060,660]];
    for(const [i,[cx,cy,tx,ty]] of positions.entries()){
      const phase=mod(t*.14+i*.213,1),a=Math.sin(phase*Math.PI)**.7,x=cx+Math.sin(t*.2+i)*60,y=cy+Math.cos(t*.25+i)*18;
      for(let k=0;k<4;k++){ctx.save();ctx.globalAlpha=a*(.5+k*.07);ctx.drawImage(cloudTexture,x-230+k*25,y-74-k*9,460,160);ctx.restore();}
      const pulse=mod(t+i*.71,3.9),flash=(pulse>.85&&pulse<1.02)||(pulse>1.14&&pulse<1.22);
      if(!flash||a<.35)continue;
      ctx.save();ctx.globalAlpha=a*.9;ctx.lineJoin='round';ctx.shadowColor='#87ddff';ctx.shadowBlur=12;
      const seed=Math.floor((t+i*.71)/3.9),points=Array.from({length:7},(_,k)=>[x+(tx-x)*k/6+(k&&k<6?(hash(seed*31+i,k)-.5)*65:0),y+45+(ty-y-45)*k/6]);
      ctx.beginPath();points.forEach(([x,y],k)=>k?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.strokeStyle='#85c9ff';ctx.lineWidth=10;ctx.stroke();ctx.strokeStyle='#f0fcff';ctx.lineWidth=4;ctx.stroke();
      ctx.shadowBlur=0;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(...points[3]);ctx.lineTo(points[3][0]-36,points[3][1]+22);ctx.lineTo(points[3][0]-22,points[3][1]+43);ctx.stroke();ctx.restore();halo(ctx,tx,ty,48,'#c5f7ff',a*.5);
    }
  }

  function render(t){
    for(const item of scenes){
      const {canvas,ctx,kind}=item;if(!canvas.isConnected||!ctx)continue;const r=canvas.getBoundingClientRect();
      if(r.right<0||r.left>innerWidth||r.bottom<0||r.top>innerHeight)continue;
      root.TreasureEffects.fitIslandCanvas(canvas,r);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.setTransform(canvas.width/1536,0,0,canvas.height/1024,0,0);
      if(kind==='fog')fog(ctx,t);else if(kind==='reef')reef(item,t);else if(kind==='snow')snow(ctx,t);
      else if(kind==='coral')coral(item,t);else if(kind==='lighthouse')lighthouse(ctx,t);else if(kind==='crystal')crystal(ctx,t);
      else if(kind==='spores')spores(ctx,t);else if(kind==='dragon-smoke')dragonSmoke(ctx,t);else if(kind==='thunder')thunder(ctx,t);
      else{flow(item,t);if(kind==='sakura')petals(ctx,t);}
      canvas.dataset.motionFrame=String(Math.round(t*1000));
    }
  }
  root.TreasureAtmosphere=Object.freeze({kinds,markup,bind,render,waterMask});
})(window);

