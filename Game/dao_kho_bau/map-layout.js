(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./map-routes.js'));else root.TreasureMapLayout=factory(root.TreasureMapRoutes);
})(typeof globalThis!=='undefined'?globalThis:this,function(Routes){
  'use strict';
  const WIDTH=4800,VIEW_WIDTH=1600;
  // Full footprint: 232px artwork plus the label, from y-145 through y+35.
  // 64 world pixels leave at least 54 screen pixels of water at 1368x838.
  const FOOTPRINT=Object.freeze({width:234,height:180,top:-145,bottom:35});
  const MIN_WATER_GAP=64;
  const MIN_VISIBLE_ROUTE=80;
  const random=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
  const coastLimit=x=>Math.min(735,490+Math.min(x-195,1405-x)*.65);
  const waterGap=(a,b)=>Math.hypot(Math.max(0,Math.abs(a.x-b.x)-FOOTPRINT.width),Math.max(0,Math.abs(a.y-b.y)-FOOTPRINT.height));
  const separated=(a,b)=>waterGap(a,b)>=MIN_WATER_GAP;
  function keepAtSea(p){
    p.x=Math.max(p.upper?270:195,Math.min(p.upper?1330:1405,p.x));
    p.y=Math.max(p.minY||(p.upper?315:405),Math.min(p.maxY||(p.upper?355:coastLimit(p.x)),p.y));
  }
  function settle(points){
    for(let pass=0;pass<500;pass++){
      for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
        const a=points[i],b=points[j],dx=b.x-a.x,dy=b.y-a.y;
        const gx=Math.max(0,Math.abs(dx)-FOOTPRINT.width),gy=Math.max(0,Math.abs(dy)-FOOTPRINT.height),gap=Math.hypot(gx,gy);
        if(gap>=MIN_WATER_GAP)continue;
        let x=0,y=0;
        if(gap>0){x=gx/gap*Math.sign(dx)*(MIN_WATER_GAP-gap+.1);y=gy/gap*Math.sign(dy)*(MIN_WATER_GAP-gap+.1);}
        else if(FOOTPRINT.width+MIN_WATER_GAP-Math.abs(dx)<(FOOTPRINT.height+MIN_WATER_GAP-Math.abs(dy))*1.3)
          x=Math.sign(dx||1)*(FOOTPRINT.width+MIN_WATER_GAP-Math.abs(dx)+.1);
        else y=Math.sign(dy||1)*(FOOTPRINT.height+MIN_WATER_GAP-Math.abs(dy)+.1);
        // The first island remains at the center; other islands can be pushed apart.
        if(i===0){b.x+=x;b.y+=y;}else{a.x-=x/2;a.y-=y/2;b.x+=x/2;b.y+=y/2;keepAtSea(a);}
        keepAtSea(b);
      }
      if(points.every((a,i)=>points.slice(i+1).every(b=>separated(a,b))))return true;
    }
    return false;
  }
  function scatter(rng){
    // Reserve one or two upper islands per region, with a fresh side and height.
    // With one high island, lift the opposite island into a staggered shoulder
    // when the space is clear, rather than leaving it on the central level.
    const upperCount=rng()<.5?1:2,side=rng()<.5?-1:1;
    // Stage 1: anchor the central island. Stage 2: add three surrounding islands.
    // Stage 3: add the last four one at a time. Never advance while any pair is
    // too close, including two surrounding islands or any earlier placement.
    for(let restart=0;restart<200;restart++){
      const points=[{x:800,y:490}];let complete=true;
      for(let next=1;next<8;next++){
        const upper=next<=upperCount;
        const shoulder=next===2&&!upper;
        const p=next<3?{x:800+(next===1?side:-side)*(298+rng()*65),y:upper?315+rng()*40:405+rng()*180,upper}:
          next===3?{x:670+rng()*260,y:734.5}:{x:195+rng()*1210,y:405+rng()*330};
        p.shoulder=shoulder;p.minY=(upper?315:shoulder?365:405)+rng()*15;
        if(upper||shoulder)p.maxY=p.minY+(upper?25:30);
        keepAtSea(p);points.push(p);
        if(!settle(points)){complete=false;break;}
      }
      if(complete)return points;
    }
    // Every prefix of the bounded fallback also satisfies the same constraints.
    const fallback=[[800,490],[502.04759491358976,673.3185288070897],[1405,490],[808.9580969584149,735],[501.9737974567949,429.12813173681496],[1106.992573054969,335],[203.87379745679485,495.76796834691663],[1106.9790484792074,579.0128271666789]].map(([x,y])=>({x,y}));
    fallback[5].upper=true;
    if(upperCount===2){fallback[4].upper=true;fallback[4].y=335;}
    else{fallback[4].shoulder=true;fallback[4].y=380;}
    if(!fallback.every((a,i)=>a.y<=coastLimit(a.x)&&fallback.slice(i+1).every(b=>separated(a,b))))throw Error('Invalid map clearance fallback');
    return fallback;
  }
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
  const edge=(a,b)=>[Math.min(a,b),Math.max(a,b)];
  const same=(a,b)=>a[0]===b[0]&&a[1]===b[1];
  function connected(edges,count){const seen=new Set([1]);for(let i=0;i<count;i++)for(const[a,b]of edges){if(seen.has(a))seen.add(b);if(seen.has(b))seen.add(a);}return seen.size===count;}
  function localGraph(points){
    // The two outermost islands reserve one connection for the adjoining region.
    // A short local cycle keeps this region connected; matching fills other ports.
    const order=[points[0]],left=points.slice(1);
    while(left.length){const last=order.at(-1);left.sort((a,b)=>distance(last,a)-distance(last,b));order.push(left.shift());}
    for(let pass=0;pass<20;pass++){
      let changed=false;
      for(let i=0;i<7;i++)for(let j=i+2;j<8;j++){
        if(i===0&&j===7)continue;const a=order[i],b=order[(i+1)%8],c=order[j],d=order[(j+1)%8];
        if(distance(a,c)+distance(b,d)+.01<distance(a,b)+distance(c,d)){order.splice(i+1,j-i,...order.slice(i+1,j+1).reverse());changed=true;}
      }if(!changed)break;
    }
    const cycle=order.map((p,i)=>edge(p.id,order[(i+1)%8].id));let best=null,bestCost=Infinity;
    function match(rest,edges,cost){
      if(cost>=bestCost)return;if(!rest.length){best=edges;bestCost=cost;return;}
      const [a,...others]=rest;
      for(const b of others){const pair=edge(a.id,b.id);if(cycle.some(e=>same(e,pair)))continue;match(others.filter(p=>p!==b),[...edges,pair],cost+distance(a,b)**2);}
    }
    match(points.slice(1,-1),[],0);
    let edges=[...cycle,...best];
    const byId=new Map(points.map(p=>[p.id,p]));
    const lengths=new Map();
    for(const a of points)for(const b of points)if(a.id<b.id){
      const ranks=p=>points.filter(n=>n!==p).sort((m,n)=>distance(p,m)-distance(p,n));
      const rank=Math.max(ranks(a).indexOf(b),ranks(b).indexOf(a));
      lengths.set(a.id+'-'+b.id,distance(a,b)**2*(1+Math.max(0,rank-2)*.35));
    }
    const crosses=(e,f)=>{
      if(new Set([...e,...f]).size!==4)return false;
      const [a,b,c,d]=[...e,...f].map(id=>byId.get(id));
      const side=(p,q,r)=>(q.x-p.x)*(r.y-p.y)-(q.y-p.y)*(r.x-p.x);
      return side(a,b,c)*side(a,b,d)<0&&side(c,d,a)*side(c,d,b)<0;
    };
    const cost=list=>list.reduce((sum,e,i)=>sum+lengths.get(e.join('-'))+list.slice(i+1).filter(f=>crosses(e,f)).length*160000,0);
    const isConnected=list=>{
      const seen=new Set([points[0].id]);for(let i=0;i<8;i++)for(const[a,b]of list){if(seen.has(a))seen.add(b);if(seen.has(b))seen.add(a);}return seen.size===8;
    };
    // Keep the region portals fixed while exchanging pairs of local edges.
    for(let pass=0;pass<12;pass++){
      let improved=null,bestScore=cost(edges);
      for(let i=0;i<edges.length;i++)for(let j=i+1;j<edges.length;j++){
        const a=edges[i],b=edges[j];if(new Set([...a,...b]).size!==4)continue;
        for(const flip of [false,true]){
          const c=edge(a[0],b[flip?1:0]),d=edge(a[1],b[flip?0:1]);
          if(edges.some(e=>same(e,c)||same(e,d)))continue;
          const next=edges.map((e,k)=>k===i?c:k===j?d:e),score=cost(next);
          if(score<bestScore-1&&isConnected(next)){improved=next;bestScore=score;}
        }
      }
      if(!improved)break;edges=improved;
    }
    return edges;
  }
  function place(rng){
    const islands=[];let edges=[];
    for(let area=0;area<3;area++){
      const points=scatter(random((Math.floor(rng()*2**32)^Math.imul(area+1,2654435761))>>>0)).map((p,i)=>({...p,x:p.x+area*VIEW_WIDTH,central:i===0})).sort((a,b)=>a.x-b.x||a.y-b.y);
      points.forEach((p,i)=>{p.id=islands.length+i+1;p.name='Điểm đến '+p.id;});
      islands.push(...points);edges.push(...localGraph(points));
    }
    edges.push([8,9],[16,17],[1,24]);
    if(!connected(edges,24))throw Error('Disconnected circular map');
    return {width:WIDTH,viewWidth:VIEW_WIDTH,islands,edges};
  }
  function create(rng=Math.random){
    const hasFoodRoute=layout=>[[1,[2,3]],[24,[22,23]]].every(([base,near])=>near.some(id=>layout.edges.some(e=>e.includes(base)&&e.includes(id))));
    const seed=Math.floor(rng()*2**32)>>>0;
    for(let attempt=0;attempt<24;attempt++){
      const layout=place(random((seed^Math.imul(attempt,2246822519))>>>0));
      if(!hasFoodRoute(layout))continue;
      const routes=Routes.plan(layout.islands,layout.edges,coastLimit);
      // A route conflict invalidates placement too. Move surrounding islands
      // with a fresh deterministic proposal before accepting the whole map.
      if(routes)return {...layout,routes,placementAttempts:attempt+1};
    }
    const layout=place(random(0)),routes=Routes.plan(layout.islands,layout.edges,coastLimit);
    if(!routes||!hasFoodRoute(layout))throw Error('No safe island and route layout with nearby food access');
    return {...layout,routes,placementAttempts:25};
  }
  return Object.freeze({WIDTH,VIEW_WIDTH,FOOTPRINT,MIN_WATER_GAP,MIN_VISIBLE_ROUTE,MIN_ROUTE_GAP:Routes.MIN_ROUTE_GAP,create,coastLimit,waterGap,separated});
});
