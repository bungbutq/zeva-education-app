(function(root){
  'use strict';
  let surfaces=[];
  const density=()=>Math.max(1,(root.devicePixelRatio||1)*(root.visualViewport?.scale||1));
  function paint(item){
    const {scene,image,canvas,ctx}=item;
    if(!scene.isConnected||!image.complete||!image.naturalWidth||!ctx||item.lost)return;
    const rect=canvas.getBoundingClientRect(),ratio=density();
    // Rasterize directly from the full source, never from a previously reduced
    // browser image layer. Retain the largest backing store used this match.
    const width=Math.min(image.naturalWidth,Math.max(canvas.width,Math.ceil(Math.max(scene.clientWidth*2,rect.width*ratio))));
    const height=Math.min(image.naturalHeight,Math.max(canvas.height,Math.ceil(Math.max(scene.clientHeight*2,rect.height*ratio))));
    const source=image.currentSrc||image.src;
    if(item.source===source&&canvas.width===width&&canvas.height===height&&!item.dirty)return;
    canvas.width=width;canvas.height=height;
    ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
    ctx.drawImage(image,0,0,width,height);
    item.source=source;item.dirty=false;scene.dataset.painted='true';
  }
  function refresh(){for(const item of surfaces)paint(item);}
  function bind(containers){
    surfaces=(Array.isArray(containers)?containers:[containers]).flatMap(c=>[...c.querySelectorAll('.island-scene')]).map(scene=>{
      const image=scene.querySelector(':scope > img');if(!image)return null;
      let canvas=scene.querySelector(':scope > .island-paint');
      if(!canvas){canvas=document.createElement('canvas');canvas.className='island-paint';canvas.setAttribute('aria-hidden','true');image.after(canvas);}
      // cloneNode does not copy canvas pixels at the circular map seam.
      delete scene.dataset.painted;
      // Static art is sampled once on the CPU, so compositing/readback never
      // switches its resampling path while the animated GPU layers are busy.
      const item={scene,image,canvas,ctx:canvas.getContext('2d',{willReadFrequently:true}),dirty:true};
      canvas.oncontextlost=event=>{event.preventDefault();item.lost=true;delete scene.dataset.painted;};
      canvas.oncontextrestored=()=>{item.lost=false;item.dirty=true;paint(item);};
      if(!image.complete)image.addEventListener('load',()=>paint(item),{once:true});
      paint(item);return item;
    }).filter(Boolean);
  }
  let queued=0;
  function schedule(){if(!queued)queued=requestAnimationFrame(()=>{queued=0;refresh();});}
  addEventListener('resize',schedule);addEventListener('pageshow',schedule);
  root.visualViewport?.addEventListener('resize',schedule);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule();});
  // Moving a window between monitors can change DPR without a layout resize.
  let resolution;
  function watchDensity(){
    resolution?.removeEventListener('change',watchDensity);
    resolution=matchMedia('(resolution: '+(root.devicePixelRatio||1)+'dppx)');
    resolution.addEventListener('change',watchDensity);schedule();
  }
  watchDensity();
  root.TreasureArtworkRenderer=Object.freeze({bind,refresh,density});
})(window);
