'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../island-rules.js'),T=require('../trade.js'),L=require('../map-layout.js'),E=require('../engine.js');
const random=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/2**32);
const questions=Array.from({length:12},(_,i)=>({text:'Question '+i,options:['A','B','C','D'],answer:0}));
function decorate(map,themes){return {...map,islands:map.islands.map((s,i)=>({...s,themeId:themes[i].id,kind:themes[i].category==='boss'?'kraken':'island'}))};}
test('catalog preserves the approved 17 harvest, 8 combat, 10 treasure, one boss and two bases',()=>{
  const count=category=>R.THEMES.filter(t=>t.category===category).length;
  assert.equal(R.THEMES.length,38);assert.equal(count('harvest'),17);assert.equal(count('combat'),8);
  assert.equal(count('treasure'),10);assert.equal(count('boss'),1);assert.equal(count('base'),2);
  assert.deepEqual(R.THEMES.filter(t=>t.rarity==='rare').map(t=>t.id),[16,17,19,35]);
  assert.deepEqual(R.THEMES.filter(t=>t.edible).map(t=>t.id),[6,15,16,20,27,28,29,31,35]);
  assert.equal(T.product(5).name,'Nhân sâm');assert.equal(T.product(5).edible,false);
  assert.equal(T.product(24).name,'Mỡ cá voi');assert.equal(T.product(24).edible,false);
  assert.deepEqual(R.THEMES.filter(t=>t.category==='combat').map(t=>T.product(t.id).name),[
    'Càng cua khổng lồ','Kim cương đen','Xác ướp','Ruby đỏ','Vảy rồng','Tuyết liên','Katana Susano','Vật tổ'
  ]);
});
test('1000 draws enforce each region, include all rare resources and combat themes without duplicates',()=>{
  const all=new Set(),seenBoss=new Set(),rarePortals=new Set();
  for(let seed=0;seed<1000;seed++){
    const slots=R.selectThemes(random(seed),12+seed%2,E.EDGES),count=(group,category,rarity)=>group.filter(t=>t.category===category&&(!rarity||t.rarity===rarity)).length;
    assert.equal(slots.length,24);assert.equal(new Set(slots.map(t=>t.id)).size,24);
    assert.equal(slots[0].id,37);assert.equal(slots[23].id,38);
    for(const offset of [0,16]){
      const group=slots.slice(offset,offset+8);
      assert.equal(count(group,'base'),1);assert.equal(count(group,'treasure'),1);assert.equal(count(group,'combat'),2);
      assert.equal(count(group,'harvest','common'),3);assert.equal(count(group,'harvest','rare'),1);
    }
    const middle=slots.slice(8,16);
    assert.equal(count(middle,'boss'),1);assert.equal(count(middle,'combat'),4);assert.equal(count(middle,'treasure'),1);
    assert.equal(count(middle,'harvest','rare'),2);assert.equal(count(middle,'harvest','common'),0);
    assert.equal(slots[7].rarity,'rare');assert.equal(slots[16].rarity,'rare');
    for(const base of [1,24])assert.ok(E.EDGES.some(e=>e.includes(base)&&slots[e.find(id=>id!==base)-1].rarity==='common'));
    for(const [base,near] of [[1,[2,3]],[24,[22,23]]])assert.ok(near.some(id=>slots[id-1].edible&&slots[id-1].category==='harvest'&&E.EDGES.some(e=>e.includes(base)&&e.includes(id))));
    const boss=slots.findIndex(t=>t.category==='boss')+1;assert.ok([12,13].includes(boss));seenBoss.add(boss);
    assert.deepEqual(slots.filter(t=>t.category==='combat').map(t=>t.id).sort((a,b)=>a-b),[7,9,11,14,18,30,32,33]);
    assert.deepEqual(slots.filter(t=>t.rarity==='rare').map(t=>t.id).sort((a,b)=>a-b),[16,17,19,35]);
    slots.forEach(t=>all.add(t.id));rarePortals.add(slots[7].id);rarePortals.add(slots[16].id);
  }
  assert.equal(all.size,38);assert.equal(rarePortals.size,4);assert.equal(seenBoss.size,2);
});
test('actual geometry puts Kraken at the central anchor and rare islands on the two middle-region links',()=>{
  const positions=new Set();
  for(let seed=1;seed<=12;seed++){
    const map=L.create(random(seed)),position=R.bossPosition(map),decorated=decorate(map,R.selectThemes(random(seed),position,map.edges));
    assert.ok([12,13].includes(position));positions.add(position);assert.equal(R.validateMap(decorated),true);
    for(const [base,near] of [[1,[2,3]],[24,[22,23]]])assert.ok(near.some(id=>R.theme(decorated.islands[id-1].themeId).edible&&decorated.edges.some(e=>e.includes(base)&&e.includes(id))));
    const g=new E.Game({questions,map:decorated}),boss=g.state.islands.find(i=>i.kind==='kraken');
    assert.equal(boss.id,position);assert.equal(map.islands.find(i=>i.id===boss.id).x,2400);
    assert.equal(map.islands.find(i=>i.id===boss.id).y,490);
    assert.equal(g.state.islands.filter(i=>i.effectId==='search').length,3);
    assert.equal(g.state.islands.filter(i=>i.kind==='whale').length,0);
    for(const [from,to]of [[8,9],[17,16]])assert.ok(E.adjacent(from,to,g.map.edges));
    for(const base of [1,24])assert.ok(map.edges.some(e=>e.includes(base)&&g.state.islands.find(i=>i.id===e.find(id=>id!==base)).rarity==='common'));
  }
  assert.equal(positions.size,2);
});
test('engine rejects a quota-correct map without a common harvesting neighbor at either base',()=>{
 for(const base of [1,24]){
  const g=new E.Game({questions}),map=JSON.parse(JSON.stringify(g.map));
  const neighbors=map.edges.filter(e=>e.includes(base)).map(e=>e.find(id=>id!==base));
  const commonNeighbors=map.islands.filter(i=>neighbors.includes(i.id)&&R.theme(i.themeId).rarity==='common');
  for(const island of commonNeighbors){
   const donor=map.islands.find(i=>!neighbors.includes(i.id)&&Math.floor((i.id-1)/8)===Math.floor((base-1)/8)&&['combat','treasure'].includes(R.theme(i.themeId).category));
   assert.ok(donor);[island.themeId,donor.themeId]=[donor.themeId,island.themeId];
  }
  assert.throws(()=>new E.Game({questions,map}),/ít nhất một đảo khai thác thường/);
 }
});
test('engine rejects legacy/random maps that violate region quotas, portals or center placement',()=>{
  const g=new E.Game({questions}),copy=()=>JSON.parse(JSON.stringify(g.map));
  let map=copy();[map.islands[0].themeId,map.islands[1].themeId]=[map.islands[1].themeId,map.islands[0].themeId];
  assert.throws(()=>new E.Game({questions,map}),/Dover/);
  map=copy();map.islands[2].themeId=map.islands[1].themeId;assert.throws(()=>new E.Game({questions,map}),/không trùng/);
  map=copy();map.edges=map.edges.filter(e=>!(e.includes(8)&&e.includes(9)));assert.throws(()=>new E.Game({questions,map}),/nối trực tiếp/);
  map=copy();const boss=map.islands.find(i=>i.kind==='kraken'),other=map.islands.find(i=>i.id===(boss.id===12?13:12));
  [boss.themeId,other.themeId]=[other.themeId,boss.themeId];[boss.kind,other.kind]=[other.kind,boss.kind];
  assert.throws(()=>new E.Game({questions,map}),/chính giữa/);
  map=copy();map.islands.find(i=>i.id===8).kind='whale';assert.throws(()=>new E.Game({questions,map}),/đặc biệt duy nhất/);
});
