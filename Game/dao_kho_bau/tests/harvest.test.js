'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),T=require('../trade.js');
const questions=Array.from({length:12},(_,i)=>({text:'Harvest '+i,options:['A','B','C','D'],answer:0}));
function make(){const g=new E.Game({questions});g.leavePort();g.leavePort();return g;}
function atHarvest(g,predicate=i=>!i.edible){const island=g.state.islands.find(i=>i.category==='harvest'&&predicate(i));assert.ok(island);g.actor.position=island.id;island.explored=true;return island;}
function harvest(g){assert.ok(g.move(g.actor.position));if(g.state.phase==='ENCOUNTER')g.encounter('explore');assert.equal(g.state.phase,'REWARD');}
function finish(g){if(g.state.phase==='REWARD')g.continueReward();}

test('both rarities yield 25/50/75/100 per day for hull Lv0/1/2/3 on either team',()=>{
 for(const team of [0,1])for(const [level,quantity] of [[0,25],[1,50],[2,75],[3,100]])for(const rarity of ['common','rare']){
  const g=make();g.state.active=team;const i=atHarvest(g,i=>i.rarity===rarity&&!i.edible),t=g.actor;t.upgrades.hull=level;
  harvest(g);assert.equal(g.state.productReward.harvested,quantity);assert.equal(t.cargo[i.product],quantity);assert.equal(g.state.distanceLeft,0);
  g.collectProduct();assert.equal(t.cargo[i.product],quantity,'cannot harvest twice on the same day');
 }
});

test('purchased hull upgrade increases the next harvest without changing sail or cargo levels',()=>{
 const g=new E.Game({questions});assert.ok(g.upgrade('hull'));assert.equal(g.actor.maxHp,100);assert.equal(g.actor.speed,10);assert.equal(g.actor.upgrades.cargo,0);
 g.leavePort();g.leavePort();const i=atHarvest(g);harvest(g);assert.equal(g.state.productReward.harvested,50);assert.equal(g.actor.cargo[i.product],50);
});

test('upgraded food yield still feeds today, fills cargo, then refills reserve without overflow',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='rare'),t=g.actor;t.upgrades.hull=3;t.upgrades.cargo=3;t.voyageDays=3;t.cargo={12:240};
 harvest(g);assert.equal(g.state.productReward.harvested,100);assert.equal(t.dayFood,50);assert.equal(t.cargo[i.product],10);assert.equal(T.cargoCount(t),250);
 assert.equal(g.state.productReward.reserveFood,40);assert.equal(T.remainingDays(t),.8);finish(g);assert.equal(T.remainingDays(t),.8);assert.equal(t.hp,50);
});

test('both common and rare harvest yield 25 at hull Lv0, repeatable on a later day with one yield per day',()=>{
 for(const [rarity,yieldPerDay] of [['common',25],['rare',25]]){
  const g=make(),i=atHarvest(g,i=>i.rarity===rarity&&!i.edible),t=g.actor;
  harvest(g);assert.equal(t.cargo[i.product],yieldPerDay);assert.equal(g.state.productReward.quantity,yieldPerDay);assert.equal(g.state.distanceLeft,0);assert.equal(g.canExplore(),false);
  assert.equal(g.answer(0),false);g.collectProduct();assert.equal(t.cargo[i.product],yieldPerDay);
  finish(g);assert.equal(t.voyageDays,1);assert.equal(t.turns,1);assert.equal(g.actor.id,1);g.skipRemaining();assert.equal(g.canExplore(),true);
  harvest(g);assert.equal(t.cargo[i.product],2*yieldPerDay);finish(g);assert.equal(t.voyageDays,2);
 }
});
test('known islands harvest directly without a question or repeated answer-gold rewards',()=>{
 const g=make(),i=atHarvest(g),t=g.actor;harvest(g);assert.equal(t.cargo[i.product],25);assert.equal(t.gold,100);assert.equal(g.state.history.length,0);finish(g);
 assert.equal(t.turns,1);assert.equal(t.voyageDays,1);g.skipRemaining();harvest(g);assert.equal(t.cargo[i.product],50);assert.equal(t.gold,100);assert.equal(g.state.history.length,0);
});
test('near-full holds receive only available space and full holds cannot start another harvesting day',()=>{
 const g=make(),i=atHarvest(g),t=g.actor;t.cargo={12:93};harvest(g);assert.equal(t.cargo[i.product],7);assert.equal(g.state.productReward.quantity,7);assert.equal(T.cargoCount(t),100);
 finish(g);g.skipRemaining();assert.equal(g.canExplore(),false);assert.equal(g.move(i.id),false);assert.equal(t.totalDays,1);
});
test('both teams can harvest the same island on their own days without globally depleting it',()=>{
 const g=make(),i=atHarvest(g);harvest(g);finish(g);g.opponent.position=24;g.actor.position=i.id;harvest(g);assert.equal(g.actor.cargo[i.product],25);finish(g);
 assert.equal(g.state.teams[0].cargo[i.product],25);assert.equal(g.state.teams[1].cargo[i.product],25);assert.equal(i.productCollectedBy,null);
});
test('fresh edible harvest can replace exhaustion on the same day, using 25 units as the gross Lv0 yield for either rarity',()=>{
 for(const [rarity,yieldPerDay] of [['common',25],['rare',25]]){
  const g=make(),i=atHarvest(g,i=>i.rarity===rarity&&i.edible),t=g.actor;t.voyageDays=3;t.hp=1;
  harvest(g);assert.equal(t.cargo[i.product]||0,yieldPerDay-20);assert.equal(g.state.productReward.dailyFood,20);assert.equal(t.hp,1);finish(g);
  assert.equal(t.hp,1);assert.equal(T.cargoCount(t),yieldPerDay-20);assert.equal(t.voyageDays,4);assert.equal(g.state.winner,null);
 }
});
test('non-edible harvest never replaces provisions or damage; harvesting consumes leftover travel distance',()=>{
 const g=make(),i=atHarvest(g,i=>!i.edible),t=g.actor;t.voyageDays=3;g.state.distanceLeft=40;
 harvest(g);assert.equal(g.state.distanceLeft,0);assert.equal(t.cargo[i.product],25);finish(g);assert.equal(t.hp,30);assert.equal(t.cargo[i.product],25);
});

test('fresh food feeds today before storage, preserving existing reserve until the next day',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.voyageDays=1;
 harvest(g);assert.equal(t.dayFood,20);assert.equal(t.cargo[i.product],5);assert.equal(T.remainingDays(t),2);finish(g);
 assert.equal(t.voyageDays,2);assert.equal(T.remainingDays(t),2);assert.equal(t.dayFood,0);assert.equal(t.cargo[i.product],5);
 g.skipRemaining();g.skipRemaining();assert.equal(T.remainingDays(t),1);assert.equal(t.cargo[i.product],5);
});

test('food beyond storage refills reserve after the daily meal, including partial days',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.voyageDays=3;t.cargo={12:98};
 harvest(g);assert.equal(t.cargo[i.product],2);assert.equal(T.cargoCount(t),100);assert.equal(g.state.productReward.dailyFood,20);assert.equal(g.state.productReward.reserveFood,3);assert.ok(Math.abs(T.remainingDays(t)-.15)<1e-8);
 finish(g);assert.equal(t.hp,50);assert.ok(Math.abs(T.remainingDays(t)-.15)<1e-8);assert.equal(T.cargoCount(t),100);
});

test('a full hold can still harvest food for the day and refill reserve without exceeding its cap',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.voyageDays=.25;t.cargo={12:100};
 assert.equal(g.canExplore(),true);harvest(g);assert.equal(g.state.productReward.quantity,0);assert.equal(g.state.productReward.reserveFood,5);assert.equal(g.state.productReward.discarded,0);assert.equal(T.remainingDays(t),3);assert.equal(T.cargoCount(t),100);
 finish(g);g.skipRemaining();assert.equal(g.canExplore(),true);harvest(g);assert.equal(g.state.productReward.dailyFood,20);assert.equal(g.state.productReward.reserveFood,0);assert.equal(T.remainingDays(t),3);
});

test('overflow can restore reserve even after many exhausted days, without repaying a negative balance',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.voyageDays=20;t.cargo={12:100};t.hp=1;
 harvest(g);assert.equal(T.remainingDays(t),.25);finish(g);assert.equal(T.remainingDays(t),.25);assert.equal(t.hp,1);assert.equal(t.voyageDays,21);
});

test('partial daily food uses only the missing fraction of reserve at larger cargo levels',()=>{
 for(const [level,food,used]of [[1,25,1/6],[2,25,3/8],[3,25,.5]]){
  const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.upgrades.cargo=level;
  harvest(g);assert.equal(t.dayFood,food);assert.equal(t.cargo[i.product]||0,25-food);finish(g);assert.ok(Math.abs(T.remainingDays(t)-(3-used))<1e-6);assert.equal(t.hp,50);
 }
});

test('when a partial fresh meal and reserve run out, cargo covers only the missing units, using partial stocks before damage',()=>{
 for(const [stock,hp,left]of [[25,30,0],[24,29,0]]){
  const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='common'),t=g.actor;t.upgrades.cargo=3;t.voyageDays=3;t.hp=30;t.cargo={6:stock};
  harvest(g);assert.equal(t.dayFood,25);assert.equal(T.daySupply(t).foodNeeded,25);finish(g);assert.equal(t.hp,hp);assert.equal(t.cargo[6]||0,left);assert.equal(T.remainingDays(t),0);
 }
});

test('rare food yields 25 units at hull Lv0 and combines fractional reserve with common cargo before rare cargo',()=>{
 const g=make(),i=atHarvest(g,i=>i.edible&&i.rarity==='rare'),t=g.actor;t.upgrades.cargo=3;t.voyageDays=3;t.provisionCredit=.2;t.hp=30;t.cargo={6:15,16:10};
 harvest(g);assert.equal(g.state.productReward.harvested,25);assert.equal(t.dayFood,25);assert.equal(g.state.productReward.quantity,0);assert.equal(T.daySupply(t).foodNeeded,15);
 finish(g);assert.equal(t.hp,30);assert.equal(T.remainingDays(t),0);assert.deepEqual(t.cargo,{16:10});
});

test('returning to either port clears food credits and refills reserve even after a long voyage',()=>{
 for(const base of [1,24]){
  const g=make(),t=g.actor;t.position=g.map.edges.find(e=>e.includes(base)).find(id=>id!==base);t.voyageDays=20;t.provisionCredit=18;t.hp=12;t.cargo={6:7};g.state.distanceLeft=30;
  assert.equal(T.remainingDays(t),1);g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(t.provisionCredit,0);assert.equal(t.dayFood,0);assert.equal(t.voyageDays,0);assert.equal(T.remainingDays(t),3);assert.equal(t.hp,t.maxHp);assert.deepEqual(t.cargo,{6:7});
  t.gold=200;assert.equal(g.upgrade('hull'),true);assert.equal(g.upgrade('provisions'),true);assert.equal(T.remainingDays(t),6);
 }
});

test('both teams harvest edible goods into reserve with full holds at high or low durability',()=>{
 for(const teamId of [0,1])for(const rarity of ['common','rare'])for(const hp of [30,50]){
  const g=make();g.state.active=teamId;const i=atHarvest(g,i=>i.edible&&i.rarity===rarity),t=g.actor;t.hp=hp;t.voyageDays=3;t.cargo={12:100};
  assert.ok(g.canMove(i.id));harvest(g);assert.equal(g.state.productReward.reserveFood,5);finish(g);
  assert.equal(t.hp,hp);assert.deepEqual(t.cargo,{12:100});assert.equal(T.remainingDays(t),.25);
 }
});
