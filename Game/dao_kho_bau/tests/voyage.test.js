'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),Y=require('../shipyard.js'),T=require('../trade.js');
const questions=Array.from({length:12},(_,i)=>({text:'Question '+i,options:['A','B','C','D'],answer:0}));
function make(level=0){const g=new E.Game({questions});g.actor.gold=3200;for(let n=0;n<level;n++){g.upgrade('hull');g.upgrade('sail');}g.leavePort();g.leavePort();g.state.islands.forEach(i=>i.explored=true);return g;}
const neighbor=(g,from=g.actor.position)=>g.map.edges.filter(e=>e.includes(from)).flat().find(id=>id!==from&&!g.state.islands.find(i=>i.id===id).start&&g.state.islands.find(i=>i.id===id).kind==='island');
function nextDay(g){if(g.state.phase==='TRAVEL')g.continueTravel();else g.skipRemaining();assert.equal(g.actor.id,1);g.skipRemaining();assert.equal(g.actor.id,0);}
function resolve(g){if(g.state.phase==='ISLAND_BATTLE')g.fightIsland();if(g.state.phase==='CHEST')g.openChest();if(g.state.phase==='REWARD')g.continueReward();}
function combatLeg(g){g.actor.attack=500;const target=g.state.islands.find(i=>i.category==='combat').id;g.actor.position=g.map.edges.find(e=>e.includes(target)).find(id=>id!==target);return target;}
test('all five ship stats follow approved Lv0..3 formulas and durability is a percentage of the hull limit',()=>{
 assert.deepEqual([0,1,2,3].map(Y.speed),[10,20,30,40]);assert.deepEqual([0,1,2,3].map(Y.attack),[5,10,15,20]);
 assert.deepEqual([0,1,2,3].map(T.capacity),[100,150,200,250]);assert.deepEqual([0,1,2,3].map(T.voyageCapacity),[3,6,9,12]);
 assert.deepEqual([0,1,2,3].map(Y.maxDurability),[50,100,150,200]);assert.equal(Y.durability({hp:25,maxHp:50}),50);
 const g=new E.Game({questions});assert.equal(g.actor.hp,50);assert.equal(g.actor.attack,5);assert.equal(g.actor.speed,10);
 assert.equal(T.remainingDays(g.actor),3);g.actor.hp=25;assert.ok(g.upgrade('hull'));assert.equal(g.actor.hp,75);assert.equal(g.actor.maxHp,100);
});
test('starter ship needs three of its own turns to travel one 30-mile edge; no premature arrival or question',()=>{
 const g=make(),target=neighbor(g),from=g.actor.position;
 for(let day=1;day<=3;day++){
  const result=g.move(target);assert.equal(g.actor.totalDays,day);assert.equal(g.actor.voyageDays,day-1);assert.equal(g.actor.hp,50);
  assert.equal(result.end,day/3);assert.equal(g.state.distanceLeft,0);
  if(day<3){assert.equal(g.actor.position,from);assert.equal(g.actor.transit.travelled,10*day);assert.equal(g.base,false);assert.equal(g.canExplore(),false);assert.equal(g.state.phase,'TRAVEL');assert.equal(g.state.question,null);nextDay(g);}
  else{assert.equal(g.actor.position,target);assert.equal(g.actor.transit,null);assert.ok(['REWARD','CHEST'].includes(g.state.phase));}
 }
});
test('20-mile speed carries progress to day two and preserves the remaining 10 miles after arrival',()=>{
 const g=make(1),target=combatLeg(g);g.move(target);assert.equal(g.actor.transit.travelled,20);nextDay(g);
 const result=g.move(target);assert.equal(result.start,2/3);assert.equal(result.end,1);assert.equal(g.state.distanceLeft,10);assert.equal(g.actor.totalDays,2);
 const team=g.actor;resolve(g);assert.equal(g.actor.id,1);assert.equal(team.totalDays,2);assert.equal(team.voyageDays,2);
});
test('30-mile speed reaches one island in one day and 40-mile speed can start the next edge that same day',()=>{
 const g=make(2);g.move(neighbor(g));assert.equal(g.actor.transit,null);assert.equal(g.actor.totalDays,1);assert.equal(g.state.distanceLeft,0);
 const h=make(3);const team=h.actor;h.move(combatLeg(h));assert.equal(h.state.distanceLeft,10);resolve(h);assert.equal(h.actor.id,1);assert.equal(team.totalDays,1);assert.equal(team.voyageDays,1);
});
test('one day is charged once per turn, exhaustion begins after day three and idle turns also use a day',()=>{
 const g=make(),target=neighbor(g);g.actor.position=target;g.actor.voyageDays=3;
 assert.ok(g.skipRemaining());assert.equal(g.state.teams[0].voyageDays,4);assert.equal(g.state.teams[0].hp,30);assert.equal(g.state.teams[0].totalDays,1);
 g.skipRemaining();g.actor.hp=5;assert.ok(g.skipRemaining());assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,1);
});
test('exhaustion is charged only at day end despite multiple actions, ignores defenses and uses the missing food count',()=>{
 const g=make(3),target=combatLeg(g);g.actor.voyageDays=3;g.actor.shield=true;g.actor.armor=99;const hp=g.actor.hp;
 g.move(target);assert.equal(g.actor.hp,hp);assert.equal(g.actor.voyageDays,3);resolve(g);
 const team=g.state.teams[0];assert.equal(team.hp,180);assert.equal(team.voyageDays,4);assert.equal(team.shield,true);assert.equal(team.armor,99);assert.equal(g.actor.id,1);assert.equal(g.continueReward(),false);assert.equal(team.hp,180);
});
test('returning to port refills reserve and restores full upgraded hull, while invalid moves do neither',()=>{
 const g=make(2),base=g.actor.position;g.actor.position=neighbor(g);g.actor.voyageDays=3;g.actor.hp=1;g.actor.cargo={6:20};
 const before=JSON.stringify(g.state);assert.equal(g.move(999),false);assert.equal(JSON.stringify(g.state),before);
 g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(g.actor.hp,g.actor.maxHp);assert.equal(g.actor.voyageDays,0);assert.equal(T.remainingDays(g.actor),3);
 g.leavePort();assert.equal(g.state.teams[0].hp,g.state.teams[0].maxHp);assert.equal(g.state.teams[0].voyageDays,0);assert.deepEqual(g.state.teams[0].cargo,{6:20});
});
test('ships between islands cannot be attacked or use a port at their source island',()=>{
 const g=make(),from=g.actor.position;g.move(neighbor(g));assert.equal(g.base,false);assert.equal(g.marketPrices(),null);
 g.continueTravel();g.actor.position=from;assert.equal(g.enemyHere,false);
});
test('each connected edge costs 30 miles in both directions, including the wrapped bases',()=>{
 for(const [a,b] of E.EDGES)for(const [from,to] of [[a,b],[b,a]]){
  const g=make();g.actor.position=from;const result=g.move(to);assert.ok(result);assert.equal(g.actor.transit.travelled,10);assert.equal(result.end,1/3);assert.equal(g.actor.transit.to,to);
 }
});
test('last reserve day is safe, including with food aboard, and idle port days stay fully supplied',()=>{
 const g=make();g.actor.position=neighbor(g);g.actor.voyageDays=2;g.actor.cargo={6:20};const t=g.actor;
 g.skipRemaining();assert.equal(t.voyageDays,3);assert.equal(t.hp,50);assert.deepEqual(t.cargo,{6:20});g.skipRemaining();g.skipRemaining();
 assert.equal(t.voyageDays,4);assert.equal(t.hp,30);assert.deepEqual(t.cargo,{6:20});
 const h=make();h.actor.voyageDays=3;h.actor.hp=1;h.actor.cargo={6:20};h.skipRemaining();
 assert.equal(h.state.teams[0].voyageDays,0);assert.equal(h.state.teams[0].hp,1);assert.deepEqual(h.state.teams[0].cargo,{6:20});
});
test('20 percent of maximum cargo is used as one complete ration and common food is consumed before rare food',()=>{
 assert.deepEqual([0,1,2,3].map(T.foodRequired),[20,30,40,50]);
 for(let level=0;level<=3;level++){
  const g=make();g.actor.position=neighbor(g);g.actor.upgrades.cargo=level;g.actor.voyageDays=3;g.actor.hp=30;
  const needed=T.foodRequired(level);g.actor.cargo={6:needed-5,16:10,1:3,5:2,24:4};const t=g.actor;
  g.skipRemaining();assert.equal(t.hp,30);assert.deepEqual(t.cargo,{16:5,1:3,5:2,24:4});assert.equal(t.voyageDays,4);assert.equal(T.foodCount(t),5);
  assert.match(g.state.dayReport,new RegExp('dùng thêm '+needed+' đơn vị'));
 }
});
test('food from different edible products combines; non-edible or unknown goods never count and partial food is consumed before shortage damage',()=>{
 const g=make();g.actor.position=neighbor(g);g.actor.voyageDays=3;g.actor.hp=30;g.actor.cargo={6:4,15:4,20:4,27:4,29:4,35:3};const t=g.actor;
 assert.equal(T.foodCount(t),23);g.skipRemaining();assert.deepEqual(t.cargo,{35:3});assert.equal(t.hp,30);
 const h=make();h.actor.position=neighbor(h);h.actor.voyageDays=3;h.actor.hp=30;h.actor.cargo={6:19,5:30,24:30,999:10};const original={...h.actor.cargo},team=h.actor;
 assert.equal(T.foodCount(team),19);assert.equal(T.foodPlan(team),null);h.skipRemaining();assert.deepEqual(team.cargo,{5:30,24:30,999:10});assert.equal(team.hp,29);
});
test('no reserve or food causes fatal damage at day end, while food can save a ship at one durability',()=>{
 const g=make();g.actor.voyageDays=3;g.actor.hp=5;g.move(neighbor(g));assert.equal(g.actor.hp,5);assert.equal(g.state.phase,'TRAVEL');g.continueTravel();
 assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,1);assert.equal(g.state.teams[0].hp,0);
 const h=make();h.actor.voyageDays=3;h.actor.hp=1;h.actor.cargo={6:20};h.move(neighbor(h));h.continueTravel();
 assert.equal(h.state.phase,'MAP');assert.equal(h.state.winner,null);assert.equal(h.state.teams[0].hp,1);assert.deepEqual(h.state.teams[0].cargo,{});
});

test('automatic cargo meals start at or below 70 percent for either team and every hull capacity',()=>{
 for(const teamId of [0,1])for(const maxHp of [50,100,150,200])for(const percent of [69,70,71]){
  const g=make();g.state.active=teamId;const t=g.actor;t.position=neighbor(g);t.maxHp=maxHp;t.hp=maxHp*percent/100;t.voyageDays=3;t.cargo={6:40,1:5};
  const before=t.hp;g.skipRemaining();
  assert.equal(t.hp,percent<=70?before:before-20);assert.deepEqual(t.cargo,{6:percent<=70?20:40,1:5});
 }
});

test('after falling below the threshold, later hungry days consume food without further durability loss',()=>{
 const g=make(),t=g.actor;t.position=neighbor(g);t.hp=40;t.voyageDays=3;t.cargo={6:45};
 g.skipRemaining();assert.equal(t.hp,20);assert.deepEqual(t.cargo,{6:45});
 for(const remaining of [25,0]){g.skipRemaining();g.skipRemaining();assert.equal(t.hp,20);assert.equal(t.cargo[6]||0,remaining);}
 g.skipRemaining();g.skipRemaining();assert.equal(t.hp,0);
});
