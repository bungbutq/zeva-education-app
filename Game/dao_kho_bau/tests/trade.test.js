'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),T=require('../trade.js'),Y=require('../shipyard.js');
const questions=Array.from({length:12},(_,i)=>({text:'Câu '+i,options:['A','B','C','D'],answer:0}));
const make=(rng=()=>.3)=>new E.Game({questions,rng});
const target=g=>g.state.islands.find(i=>i.category==='combat');
function discover(g,island){g.actor.position=island.id;island.explored=true;g.state.phase='MAP';g.arrive();if(g.state.phase==='ISLAND_BATTLE'){g.actor.attack=500;g.fightIsland();}if(g.state.phase==='CHEST')g.openChest();}
test('only harvesting and combat destinations have products; search islands do not grant merchant goods',()=>{
 const g=make();assert.equal(g.state.islands.filter(i=>i.product).length,18);assert.ok(g.state.islands.filter(i=>i.start||i.kind==='kraken'||i.category==='treasure').every(i=>i.product===null));
 assert.equal(new Set(T.PRODUCTS.map(p=>p.name)).size,25);assert.equal(T.product(23),undefined);assert.equal(T.product(37),undefined);assert.equal(T.product(38),undefined);
 const common=g.state.islands.filter(i=>i.category==='harvest'&&i.rarity==='common'&&i.edible),a=common[0],b=common[1];
 const map={...g.map,islands:g.map.islands.map(i=>({...i,art:{id:i.id===a.id?b.themeId:i.id===b.id?a.themeId:i.themeId}}))};
 assert.equal(new E.Game({questions,map}).state.islands.find(i=>i.id===a.id).product,b.themeId);
});
test('cargo and provisions require hull levels, preserve resources when blocked and retain their level formulas',()=>{
 const g=make();g.actor.gold=4800;
 for(let level=0;level<=3;level++){
  assert.equal(T.capacity(g.actor.upgrades.cargo),100+50*level);assert.equal(T.remainingDays(g.actor),3+3*level);
  for(const kind of ['cargo','provisions']){
   const before=JSON.stringify(g.state);assert.equal(g.upgrade(kind),false);assert.equal(JSON.stringify(g.state),before);
   assert.match(g.upgradeStatus(kind).reason,level<3?new RegExp('Thân tàu Lv'+(level+1)):/tối đa/);
  }
  if(level<3){assert.ok(g.upgrade('hull'));assert.ok(g.upgrade('cargo'));assert.ok(g.upgrade('provisions'));}
 }
 assert.equal(g.actor.gold,0);assert.equal(g.actor.upgrades.hull,3);assert.equal(g.upgrade('cargo'),false);assert.equal(g.upgrade('provisions'),false);assert.equal(Y.filename(0,g.actor.upgrades),'ship-red-h3-c0-s0.png');
});
test('combat loot is unique per island across both teams and stays outside a full hold',()=>{
 const g=make(),i=target(g),red=g.actor;red.cargo={1:100};g.askDestination(i.id);g.answer(1);assert.deepEqual(red.loot,{});
 discover(g,i);assert.equal(red.loot[i.product],1);assert.equal(i.productCollectedBy,0);assert.equal(T.cargoCount(red),100);assert.equal(g.state.productReward.full,false);
 discover(g,i);assert.equal(red.loot[i.product],1);assert.equal(g.canExplore(),false);
 g.state.active=1;discover(g,i);assert.deepEqual(g.actor.loot,{});assert.equal(g.canExplore(),false);
 g.state.active=0;red.position=24;g.state.phase='PORT';const gold=red.gold;assert.ok(g.sellProduct(i.product));assert.equal(red.gold,gold+1000);assert.deepEqual(red.loot,{});assert.equal(T.cargoCount(red),100);assert.equal(g.sellProduct(i.product),false);
 discover(g,i);assert.equal(g.canExplore(),false);assert.deepEqual(red.loot,{});assert.equal(i.productCollectedBy,0);
});

test('harvest goods and unique loot sell from separate inventories, rejecting duplicates and out-of-port sales',()=>{
 const g=make(),item=g.state.islands.find(i=>i.category==='harvest'),id=item.product;g.actor.cargo[id]=2;const price=g.marketPrices()[id],opponent=JSON.stringify(g.opponent);
 assert.ok(g.sellProduct(id));assert.equal(g.actor.gold,100+price);assert.equal(g.actor.cargo[id],1);assert.equal(JSON.stringify(g.opponent),opponent);
 for(const qty of [0,-1,.5,2,NaN])assert.equal(g.sellProduct(id,qty),false);
 assert.ok(g.sellProduct(id));assert.equal(T.cargoCount(g.actor),0);assert.equal(g.sellProduct(id),false);assert.equal(g.actor.gold,100+2*price);
 g.actor.cargo[id]=1;g.state.phase='MAP';assert.equal(g.sellProduct(id),false);assert.equal(g.actor.cargo[id],1);
});

test('loot never feeds the crew, reduces food requirements, or changes hold capacity',()=>{
 const g=make(),i=target(g);g.actor.cargo={6:19};g.actor.loot[i.product]=1;assert.equal(T.cargoCount(g.actor),19);assert.equal(T.foodCount(g.actor),19);assert.equal(T.foodRequired(g.actor.upgrades.cargo),20);assert.equal(T.foodPlan(g.actor),null);
 g.actor.cargo[6]=20;assert.deepEqual(T.foodPlan(g.actor),[{id:6,quantity:20}]);assert.equal(g.actor.loot[i.product],1);
});

test('map market preview reads stable port prices without enabling sales or changing the turn',()=>{
 const g=make(),base=g.actor.position,prices=g.marketPrices(),id=g.state.islands.find(i=>i.category==='harvest').product;
 g.actor.cargo[id]=9;g.leavePort();g.leavePort();g.actor.position=g.state.islands.find(i=>i.category==='harvest').id;
 const before=JSON.stringify(g.state);assert.equal(g.viewMarketPrices(base),prices);assert.equal(g.viewMarketPrices(base),prices);
 assert.equal(g.viewMarketPrices(-1),null);assert.equal(g.marketPrices(),null);assert.equal(g.sellProduct(id,3),false);assert.equal(JSON.stringify(g.state),before);
});

test('harvest prices stay fixed at 1 common and 5 rare for every quote; combat stays 1000',()=>{
 for(const item of T.PRODUCTS){
  const range=T.priceRange(item),expected=item.category==='combat'?[1000]:item.rarity==='rare'?[5]:[1];
  assert.deepEqual([...new Set([0,.2,.4,.6,.8,.999,1].map(r=>T.quote(item,()=>r)))],expected);
  assert.equal(T.quote(item,()=>-1),range.min);assert.equal(T.quote(item,()=>2),range.max);
 }
});

test('home departures preserve fixed prices at both merchants, including arrivals and reversing',()=>{
 let random=0;const g=make(()=>random),base=g.actor.position,redPrices=g.marketPrices();g.leavePort();const bluePrices=g.marketPrices();g.leavePort();
 const id=g.state.islands.find(i=>i.category==='harvest'&&i.rarity==='common'&&i.edible).product,near=g.map.edges.find(e=>e.includes(base)&&!e.includes(1)).find(i=>i!==base);
 random=.999;assert.deepEqual(g.state.markets[base],redPrices);g.state.islands[near-1].explored=true;g.move(near);assert.equal(g.state.phase,'TRAVEL');assert.equal(g.state.markets[base][id],1);assert.deepEqual(g.state.markets[1],bluePrices);
 const newPrices=g.state.markets[base];g.continueTravel();g.skipRemaining();random=0;g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(g.marketPrices(),newPrices);assert.equal(g.marketPrices()[id],1);
 g.leavePort();g.skipRemaining();g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(g.marketPrices(),newPrices);g.leavePort();g.skipRemaining();
 g.move(near);assert.equal(g.state.markets[base][id],1);assert.deepEqual(g.state.markets[1],bluePrices);
});

test('wrong gate answer, opening the yard and waiting at home cannot refresh prices',()=>{
 let random=0;const g=make(()=>random),prices=g.marketPrices(),base=g.actor.position;g.leavePort();g.leavePort();random=.999;
 const near=g.map.edges.find(e=>e.includes(base)&&!e.includes(1)).find(i=>i!==base);assert.ok(g.move(near).question);assert.deepEqual(g.state.markets[base],prices);g.answer(1);g.continueAnswer();g.skipRemaining();assert.deepEqual(g.state.markets[base],prices);
 g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(g.marketPrices(),prices);g.leavePort();g.skipRemaining();g.skipRemaining();assert.deepEqual(g.state.markets[base],prices);
});

test('visiting or leaving the other base keeps its merchant prices unchanged',()=>{
 let random=0;const g=make(()=>random);g.marketPrices();g.leavePort();const bluePrices=g.marketPrices();g.leavePort();random=.999;
 g.actor.speed=30;g.state.distanceLeft=30;g.move(1);assert.equal(g.state.phase,'PORT');assert.equal(g.marketPrices(),bluePrices);g.encounter('leave');
 // Resolve only port/encounter routing; ship 0 is still at blue base and leaves it.
 g.state.phase='MAP';g.state.active=0;g.state.distanceLeft=30;g.state.teams[1].position=24;g.move(24);assert.deepEqual(g.state.markets[1],bluePrices);
});
