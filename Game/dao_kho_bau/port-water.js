(function(root){
  'use strict';
  // Exact water boundaries traced in the 1672 x 941 harbor artwork. Refine only
  // their narrow edges, retaining warm reflections inside the water surface.
  const regions={
  "red": {
    "water": "M 119 669 L 120 561 L 136 554 L 145 551 L 164 548 L 178 546 L 207 539 L 207 546 L 220 548 L 230 546 L 232 531 L 242 530 L 244 527 L 267 524 L 269 530 L 289 531 L 291 521 L 306 519 L 309 516 L 335 509 L 337 515 L 354 515 L 357 507 L 370 501 L 373 507 L 388 504 L 391 484 L 426 481 L 453 478 L 478 479 L 511 476 L 526 474 L 530 479 L 540 477 L 544 472 L 560 472 L 568 475 L 576 474 L 578 478 L 589 477 L 591 474 L 615 472 L 623 474 L 629 472 L 648 471 L 657 473 L 660 471 L 692 472 L 694 475 L 707 474 L 710 472 L 728 471 L 737 473 L 744 470 L 775 471 L 786 471 L 795 474 L 802 472 L 815 470 L 829 469 L 840 470 L 851 467 L 858 464 L 875 462 L 883 454 L 897 450 L 914 452 L 938 449 L 964 450 L 986 447 L 1016 444 L 1037 441 L 1065 440 L 1081 438 L 1103 439 L 1117 441 L 1139 438 L 1151 440 L 1176 438 L 1196 437 L 1208 434 L 1225 436 L 1250 434 L 1268 435 L 1280 432 L 1293 435 L 1313 435 L 1323 416 L 1378 416 L 1384 413 L 1436 413 L 1450 414 L 1554 414 L 1594 413 L 1657 414 L 1672 414 L 1672 941 L 908 941 L 911 925 L 910 911 L 902 902 L 899 871 L 892 862 L 881 856 L 864 850 L 841 849 L 819 853 L 802 861 L 794 871 L 795 909 L 763 893 L 729 880 L 725 874 L 707 865 L 702 850 L 700 834 L 697 829 L 696 793 L 688 786 L 674 781 L 654 779 L 634 783 L 619 790 L 618 830 L 605 834 L 598 833 L 589 837 L 571 833 L 554 827 L 527 818 L 503 812 L 508 798 L 505 782 L 500 776 L 498 757 L 491 751 L 479 747 L 459 745 L 441 747 L 432 751 L 431 767 L 425 772 L 423 785 L 410 782 L 387 776 L 366 770 L 344 764 L 352 749 L 352 732 L 348 716 L 347 701 L 341 696 L 326 692 L 309 692 L 291 695 L 285 702 L 283 711 L 278 719 L 279 729 L 276 739 L 278 745 L 257 739 L 228 731 L 201 723 L 179 716 L 177 677 L 172 670 L 155 667 L 140 669 L 129 674 L 129 702 L 119 703 Z",
    "holes": [
      "M 148 548 L 159 548 L 166 557 L 166 566 L 179 577 L 182 588 L 189 596 L 185 604 L 183 636 L 187 642 L 181 650 L 172 654 L 171 660 L 145 660 L 139 654 L 127 651 L 122 642 L 126 634 L 124 608 L 122 601 L 127 590 L 128 580 L 140 566 L 140 556 Z"
    ],
    "waterPockets": [
      "M 1194 419 L 1208 419 L 1203 424 L 1198 428 L 1195 425 Z",
      "M 1234 418 L 1271 418 L 1322 417 L 1313 434 L 1303 429 L 1295 425 L 1287 427 L 1280 433 L 1274 429 L 1265 431 L 1247 430 L 1239 420 Z"
    ]
  },
  "blue": {
    "water": "M 106 464 L 117 462 L 122 464 L 131 464 L 138 459 L 144 457 L 150 453 L 153 442 L 163 437 L 168 433 L 174 437 L 182 435 L 184 432 L 202 429 L 206 433 L 215 431 L 217 427 L 238 425 L 265 423 L 275 424 L 287 423 L 296 421 L 299 426 L 310 427 L 314 423 L 329 421 L 354 419 L 387 418 L 393 421 L 403 419 L 431 416 L 461 411 L 488 410 L 492 413 L 499 412 L 513 408 L 522 407 L 526 408 L 535 409 L 541 407 L 552 409 L 567 408 L 576 411 L 594 409 L 603 411 L 614 411 L 628 410 L 637 410 L 645 411 L 649 411 L 660 413 L 670 411 L 677 412 L 684 413 L 692 411 L 704 414 L 710 416 L 721 416 L 733 416 L 745 418 L 756 418 L 771 418 L 777 416 L 789 416 L 797 420 L 814 421 L 830 420 L 840 419 L 851 420 L 863 420 L 876 419 L 892 419 L 907 418 L 920 416 L 934 416 L 944 414 L 957 412 L 973 410 L 981 405 L 976 398 L 965 390 L 952 392 L 947 384 L 943 376 L 929 377 L 921 380 L 918 357 L 947 356 L 981 356 L 1022 355 L 1063 355 L 1098 355 L 1137 354 L 1188 354 L 1235 355 L 1303 355 L 1372 354 L 1444 355 L 1519 354 L 1580 355 L 1643 355 L 1672 354 L 1672 941 L 729 941 L 718 931 L 706 924 L 705 875 L 702 863 L 690 853 L 671 846 L 649 842 L 631 845 L 618 849 L 615 834 L 609 815 L 614 805 L 618 793 L 613 780 L 605 768 L 598 765 L 599 719 L 594 710 L 579 703 L 557 698 L 537 697 L 515 702 L 499 710 L 490 719 L 490 749 L 479 757 L 475 766 L 470 778 L 470 793 L 474 803 L 470 816 L 456 805 L 437 792 L 419 779 L 402 766 L 402 737 L 393 726 L 379 722 L 364 724 L 350 727 L 350 737 L 337 716 L 331 696 L 327 679 L 324 660 L 321 643 L 318 626 L 325 619 L 328 611 L 326 602 L 321 593 L 320 566 L 313 561 L 301 558 L 283 558 L 268 562 L 261 568 L 260 592 L 252 600 L 246 604 L 232 605 L 221 600 L 213 592 L 206 582 L 199 568 L 197 549 L 201 541 L 201 531 L 196 525 L 194 506 L 186 501 L 171 501 L 157 504 L 154 512 L 154 526 L 147 527 L 141 522 L 141 509 L 137 504 L 137 491 L 128 488 L 116 489 L 108 493 L 106 508 L 108 515 L 106 521 L 106 536 L 99 532 L 102 509 L 104 488 Z",
    "holes": [],
    "waterPockets": [
      "M 200 584 L 208 598 L 219 607 L 232 613 L 245 612 L 252 607 L 251 617 L 256 623 L 256 652 L 251 650 L 249 632 L 241 627 L 224 628 L 215 621 L 203 613 Z",
      "M 140 535 L 148 538 L 153 536 L 153 561 L 145 569 L 142 558 Z",
      "M 637 409 L 639 401 L 643 401 L 647 408 L 648 410 Z",
      "M 319 649 L 322 663 L 327 686 L 332 705 L 334 713 L 324 702 L 320 694 L 319 678 Z"
    ]
  }
};
  const surfaces=new Map();
  function waterSurface(image,color){
    const key=color+':'+image.currentSrc;if(surfaces.has(key))return surfaces.get(key);
    const w=image.naturalWidth,h=image.naturalHeight,make=()=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};
    const photo=make(),pc=photo.getContext('2d'),mask=make(),mc=mask.getContext('2d'),rim=make(),rc=rim.getContext('2d');
    pc.drawImage(image,0,0);const pixels=pc.getImageData(0,0,w,h),region=regions[color];
    const path=new Path2D([region.water,...region.holes].join(' '));
    for(const c of [mc,rc])c.scale(w/1672,h/941);
    mc.fillStyle='#fff';mc.fill(path,'evenodd');rc.strokeStyle='#fff';rc.lineWidth=14;rc.lineJoin='round';rc.stroke(path);
    for(const d of region.waterPockets){const pocket=new Path2D(d);mc.fill(pocket);rc.stroke(pocket);}
    const body=mc.getImageData(0,0,w,h).data,edge=rc.getImageData(0,0,w,h).data,water=new Uint8Array(w*h),rgba=pixels.data;
    for(let i=0;i<water.length;i++){const k=i*4,r=rgba[k],g=rgba[k+1],b=rgba[k+2];water[i]=edge[k+3]?Number(g-r>18&&b-r>10&&(g+b)/2-r>24):Number(body[k+3]>127);}
    // Keep small reflected highlights, while leaving shore-connected wood, ropes,
    // masonry and every substantial obstacle outside the animated layer.
    const seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
    for(let start=0;start<water.length;start++)if(!water[start]&&!seen[start]){
      let head=0,tail=1;queue[0]=start;seen[start]=1;
      while(head<tail){const i=queue[head++],x=i%w;for(const j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<water.length&&!water[j]&&!seen[j]){seen[j]=1;queue[tail++]=j;}}
      if(tail<=128)for(let n=0;n<tail;n++)water[queue[n]]=1;
    }
    const alpha=mc.createImageData(w,h),distance=new Uint8Array(w*h);distance.fill(255);let head=0,tail=0;
    for(let i=0;i<water.length;i++)if(water[i]){const k=i*4;alpha.data.set([255,255,255,255],k);distance[i]=0;queue[tail++]=i;}else rgba[i*4+3]=0;
    mc.setTransform(1,0,0,1,0,0);mc.putImageData(alpha,0,0);
    // Extend ONLY water colors beneath the cutout. Distortion near a post can
    // sample these hidden pixels without dragging wood or rope into the water.
    while(head<tail){const i=queue[head++];if(distance[i]>=12)continue;const x=i%w;
      for(const j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<water.length&&distance[j]===255){distance[j]=distance[i]+1;queue[tail++]=j;rgba.set(rgba.subarray(i*4,i*4+4),j*4);}
    }
    pc.putImageData(pixels,0,0);const surface={mask,texture:photo};surfaces.set(key,surface);return surface;
  }
  function create({layer,backdrop,canvas,foreground,ship}){
    const ctx=canvas.getContext('2d'),plate=document.createElement('canvas'),pc=plate.getContext('2d');
    const waterMask=document.createElement('canvas'),wc=waterMask.getContext('2d');
    const front=foreground.getContext('2d');
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    if(location.protocol!=='file:')backdrop.crossOrigin='anonymous';
    let active=false,color='red',frame=0,last=0,scale=1,anchor={x:520,y:680},ready=false;
    function fitShip(){
      const requested=Number(ship.dataset.portScale)||1;
      // Fit the largest hull with full sails once, then preserve hull-level ratios.
      // Per-sail headroom used to shrink the entire hull when sails were upgraded.
      const harborFit=Math.min(1,Math.max(0,anchor.y+55-205)/(470*1.5));
      ship.style.scale=String(requested*harborFit);
    }
    function fit(){
      ready=false;if(!active||!backdrop.complete||!backdrop.naturalWidth)return;
      const w=layer.clientWidth,h=layer.clientHeight;if(!w||!h)return;
      const cover=Math.max(w/backdrop.naturalWidth,h/backdrop.naturalHeight),iw=backdrop.naturalWidth*cover,ih=backdrop.naturalHeight*cover,ox=(w-iw)/2,oy=(h-ih)/2;
      const width=Math.min(1920,Math.max(960,Math.ceil(layer.getBoundingClientRect().width*(root.devicePixelRatio||1))));scale=width/w;
      canvas.width=plate.width=foreground.width=waterMask.width=width;canvas.height=plate.height=foreground.height=waterMask.height=Math.ceil(h*scale);
      const surface=waterSurface(backdrop,color);
      pc.setTransform(scale,0,0,scale,0,0);pc.drawImage(surface.texture,ox,oy,iw,ih);
      wc.setTransform(scale,0,0,scale,0,0);wc.drawImage(surface.mask,ox,oy,iw,ih);
      // Move the ship and its contact water together within each harbor.
      anchor={x:ox+.32*iw,y:oy+.62*ih+(color==='red'?40:-20)};
      layer.style.setProperty('--port-ship-x',anchor.x+'px');layer.style.setProperty('--port-waterline',anchor.y+'px');
      fitShip();
      canvas.dataset.waterline=String(anchor.y);canvas.dataset.shipCenter=String(anchor.x);canvas.dataset.harbor=color;canvas.dataset.maskVersion='harbor-contours-v2';ready=true;paint(reduced.matches?0:performance.now());
    }
    function paintImmersion(t){
      front.setTransform(1,0,0,1,0,0);front.clearRect(0,0,foreground.width,foreground.height);
      const size=470*(Number(ship.style.scale)||1),left=anchor.x-size*.53,width=size*1.06;
      const line=anchor.y+Math.sin(t*1.4)*2,depth=70;
      // Reuse the very same water pixels in front of the hull. The soft edge
      // hides its lowest boards without a solid stripe or moving the quays.
      front.save();front.setTransform(scale,0,0,scale,0,0);
      // Fill the hull contact line with water, then apply the same exact shoreline
      // mask to both moving layers so neither can cover posts or the wooden dock.
      front.drawImage(plate,left*scale,line*scale,width*scale,depth*scale,left,line,width,depth);
      front.drawImage(canvas,left*scale,line*scale,width*scale,depth*scale,left,line,width,depth);
      front.globalCompositeOperation='destination-in';
      const fade=front.createLinearGradient(0,line,0,line+18);fade.addColorStop(0,'#0000');fade.addColorStop(.65,'#000c');fade.addColorStop(1,'#000');
      front.fillStyle=fade;front.fillRect(left,line,width,depth);front.globalCompositeOperation='source-over';
      // Small broken ripples sit at the contact line, not around the whole PNG.
      for(let i=0;i<3;i++){
        const phase=(t*.22+i/3)%1;
        front.globalAlpha=(1-phase)*.34;front.strokeStyle='#c4fff3';front.lineWidth=1.8-phase*.6;
        front.beginPath();front.ellipse(anchor.x-size*.02,line+6+phase*13,size*(.27+phase*.10),5+phase*5,0,.08,Math.PI-.08);front.stroke();
      }
      front.globalAlpha=1;front.setTransform(1,0,0,1,0,0);front.globalCompositeOperation='destination-in';front.drawImage(waterMask,0,0);
      front.restore();foreground.dataset.waterline=String(line);foreground.dataset.motionFrame=reduced.matches?'0':String(Math.round(t*1000));
    }
    function paint(now){
      if(!ready||!ctx)return;
      ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,canvas.width,canvas.height);
      ctx.save();
      // Keep the outermost subpixel of the viewport opaque under shifted strips.
      ctx.drawImage(plate,0,0);
      const t=reduced.matches?0:now/1000*1.82,band=Math.max(2,Math.round(3*scale)); // 30% faster than 1.4 in both harbors.
      for(let y=0;y<canvas.height;y+=band){
        const depth=y/canvas.height,dx=reduced.matches?0:(Math.sin(y/scale*.033-t*1.25)*3.2+Math.sin(y/scale*.017+t*.8)*1.7)*scale*depth;
        const dy=reduced.matches?0:Math.sin(y/scale*.025+t*1.1)*scale*1.4*depth,sy=Math.max(0,Math.min(canvas.height-band,y+dy));
        ctx.drawImage(plate,0,sy,plate.width,band,dx,y,plate.width,band);
        if(dx>0)ctx.drawImage(plate,0,sy,1,band,0,y,dx,band);
        else if(dx<0)ctx.drawImage(plate,plate.width-1,sy,1,band,plate.width+dx,y,-dx,band);
      }
      ctx.setTransform(scale,0,0,scale,0,0);ctx.strokeStyle='#c8ffff';ctx.lineWidth=1.5;
      const size=470*(Number(ship.style.scale)||1);
      for(let i=0;i<3;i++){
        const phase=(t*.15+i/3)%1;ctx.globalAlpha=(1-phase)*.22;
        ctx.beginPath();ctx.ellipse(anchor.x,anchor.y+3,size*(.32+phase*.12),8+phase*10,0,0,Math.PI*2);ctx.stroke();
      }
      ctx.globalAlpha=1;ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='destination-in';ctx.drawImage(waterMask,0,0);
      ctx.restore();paintImmersion(t);canvas.dataset.motionFrame=reduced.matches?'0':String(Math.round(now));
    }
    function tick(now){
      frame=0;if(!active||document.hidden||reduced.matches)return;
      if(now-last>=40){last=now;paint(now);}frame=requestAnimationFrame(tick);
    }
    function resume(){
      cancelAnimationFrame(frame);frame=0;if(!active||document.hidden)return;
      fit();if(!reduced.matches)frame=requestAnimationFrame(tick);
    }
    backdrop.addEventListener('load',resume);new ResizeObserver(()=>{if(active)resume();}).observe(layer);
    reduced.addEventListener('change',resume);document.addEventListener('visibilitychange',resume);
    // Replay hides the port outside its renderer; stop the decorative loop too.
    new MutationObserver(()=>{if(layer.hidden){active=false;cancelAnimationFrame(frame);frame=0;}}).observe(layer,{attributes:true,attributeFilter:['hidden']});
    root.addEventListener('pagehide',()=>{active=false;cancelAnimationFrame(frame);});
    return {setActive(value,nextColor=color){const changed=active!==value||color!==nextColor;active=value;color=nextColor;if(changed)resume();else if(active){fitShip();if(reduced.matches)paint(0);}}};
  }
  root.TreasurePortWater=Object.freeze({create});
})(window);
