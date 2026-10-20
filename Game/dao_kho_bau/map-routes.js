(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TreasureMapRoutes=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const WIDTH=4800,CELL=30,RESERVE=28,MIN_ROUTE_GAP=16;
  const modulo=x=>(x%WIDTH+WIDTH)%WIDTH;
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const inside=(p,n,pad=0)=>Math.abs(p.x-n.x)<=117+pad&&p.y>=n.y-145-pad&&p.y<=n.y+35+pad;
  function candidates(a,b,islands,coastLimit){
    const wrapped=Math.abs(a.x-b.x)>WIDTH/2;
    if(wrapped)b={...b,x:b.x-WIDTH};
    const neighbors=islands.flatMap(n=>[-WIDTH,0,WIDTH].map(dx=>({...n,x:n.x+dx}))).filter(n=>n.x>=Math.min(a.x,b.x)-650&&n.x<=Math.max(a.x,b.x)+650);
    const dx=b.x-a.x,dy=b.y-a.y,length=Math.hypot(dx,dy),nx=-dy/length,ny=dx/length,result=[];
    for(const bend of [0,50,-50,100,-100,160,-160,230,-230,310,-310,400,-400,510,-510,640,-640])for(const skew of [0,.5,-.5]){
      if(bend===0&&skew)continue;
      const c={x:a.x+dx/3+nx*bend*(1+skew),y:a.y+dy/3+ny*bend*(1+skew)};
      const d={x:a.x+dx*2/3+nx*bend*(1-skew),y:a.y+dy*2/3+ny*bend*(1-skew)};
      const water=[];let valid=true,total=0,run=0,visible=0,previous=a;
      for(let i=0;i<=160;i++){
        const t=i/160,u=1-t,p={x:u*u*u*a.x+3*u*u*t*c.x+3*u*t*t*d.x+t*t*t*b.x,y:u*u*u*a.y+3*u*u*t*c.y+3*u*t*t*d.y+t*t*t*b.y};
        const step=distance(previous,p),local=modulo(p.x)%1600;total+=step;
        if(p.y<185||p.y>coastLimit(Math.max(195,Math.min(1405,local)))+65||neighbors.some(n=>n.id!==a.id&&n.id!==b.id&&inside(p,n,10))){valid=false;break;}
        if(!inside(p,a,4)&&!inside(p,b,4)){run+=step;water.push({x:modulo(p.x),y:p.y});visible=Math.max(visible,run);}else run=0;
        previous=p;
      }
      if(!valid||visible<92)continue;
      const grid=new Map();
      for(const p of water){const key=Math.floor(p.x/CELL)+','+Math.floor(p.y/CELL);if(!grid.has(key))grid.set(key,[]);grid.get(key).push(p);}
      result.push({a:a.id,b:b.id,control:[a,c,d,b],water,grid,total,visible,wrapped,d:'M '+a.x+' '+a.y+' C '+c.x+' '+c.y+' '+d.x+' '+d.y+' '+b.x+' '+b.y});
    }
    return result.sort((a,b)=>a.total-b.total);
  }
  function conflict(a,b){
    for(const p of a.water){
      const gx=Math.floor(p.x/CELL),gy=Math.floor(p.y/CELL);
      for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const q of b.grid.get(((gx+dx+160)%160)+','+(gy+dy))||[]){
        const x=Math.abs(p.x-q.x);if(Math.hypot(Math.min(x,WIDTH-x),p.y-q.y)<RESERVE)return true;
      }
    }
    return false;
  }
  function validateCorridors(routes,islands){
    const grid=new Map(),cell=32;
    for(const [index,route]of routes.entries()){
      const [a,b,c,d]=route.control;
      // The derivative bound limits every arc sample to <=2 world pixels.
      // An 18.1px sample clearance therefore leaves >=16px between curves.
      const steps=Math.ceil(3*Math.max(distance(a,b),distance(b,c),distance(c,d))/2);
      for(let i=0;i<=steps;i++){
        const t=i/steps,u=1-t,p={x:modulo(u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x),y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};
        if(islands.some(n=>Math.min(Math.abs(p.x-n.x),WIDTH-Math.abs(p.x-n.x))<=117&&p.y>=n.y-145&&p.y<=n.y+35))continue;
        const gx=Math.floor(p.x/cell),gy=Math.floor(p.y/cell);
        for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(const q of grid.get(((gx+dx+150)%150)+','+(gy+dy))||[]){
          if(q.index===index)continue;const x=Math.abs(p.x-q.x);
          if(Math.hypot(Math.min(x,WIDTH-x),p.y-q.y)<MIN_ROUTE_GAP+2.1)return false;
        }
        const key=gx+','+gy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push({...p,index});
      }
    }
    return true;
  }
  function plan(islands,edges,coastLimit){
    let serial=0,visits=0;
    const routes=edges.map(([a,b])=>({choices:candidates(islands[a-1],islands[b-1],islands,coastLimit).map(c=>({...c,id:serial++}))}));
    if(routes.some(r=>!r.choices.length))return null;
    const memo=new Map();
    const collision=(a,b)=>{const key=Math.min(a.id,b.id)+':'+Math.max(a.id,b.id);if(!memo.has(key))memo.set(key,conflict(a,b));return memo.get(key);};
    function search(rest,chosen){
      if(!rest.length)return chosen;if(++visits>1200)return null;
      let next,valid;
      // Place the most constrained route first, then reserve its own sea corridor.
      for(const route of rest){
        const choices=route.choices.filter(c=>chosen.every(s=>!collision(c,s)));if(!choices.length)return null;
        if(!next||choices.length<valid.length){next=route;valid=choices;}
      }
      for(const candidate of valid){const found=search(rest.filter(r=>r!==next),[...chosen,candidate]);if(found)return found;}
      return null;
    }
    const chosen=search(routes,[]);
    return chosen&&validateCorridors(chosen,islands)?chosen.map(({a,b,d,visible,wrapped})=>({a,b,d,visible,wrapped})):null;
  }
  return Object.freeze({plan,MIN_ROUTE_GAP});
});
