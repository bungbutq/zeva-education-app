'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../engine.js'),T=require('../trade.js'),Y=require('../shipyard.js');
const questions=Array.from({length:12},(_,i)=>({text:'Hunger '+i,options:['A','B','C','D'],answer:0}));
function make(first=0){const g=new E.Game({questions,first});g.leavePort();g.leavePort();g.state.islands.forEach(i=>i.explored=true);const t=g.actor;t.position=g.state.islands.find(i=>i.category==='harvest'&&i.edible).id;t.voyageDays=3;t.maxHp=200;t.hp=140;t.upgrades.hull=3;return g;}
test('each missing unit costs one durability; partial cargo is consumed and other team is untouched',()=>{
 for(const first of [0,1])for(const available of [0,8,19,20,30]){
  const g=make(first),t=g.actor,other=g.opponent,before=JSON.stringify(other);t.cargo={6:available,24:30};g.skipRemaining();
  assert.equal(t.hp,140-Math.max(0,20-available));assert.equal(t.cargo[6]||0,Math.max(0,available-20));assert.equal(t.cargo[24],30);assert.equal(t.hungry,available<20);assert.equal(t.speed,available<20?5:10);assert.equal(JSON.stringify(other),before);
 }
});
test('fresh food and fractional reserve reduce the shortfall before partial cargo and damage',()=>{
 const g=make(),t=g.actor;g.spendDay();t.dayFood=5;t.provisionCredit=.25;t.cargo={6:3};
 assert.deepEqual([T.daySupply(t).foodNeeded,T.daySupply(t).cargoUsed,T.daySupply(t).shortfall],[10,3,7]);
 g.skipRemaining();assert.equal(t.hp,133);assert.equal(t.hungry,true);assert.equal(t.cargo[6],undefined);
});
test('hunger halves every sail tier once, governs next-day travel and clears after a complete meal',()=>{
 for(const level of [0,1,2,3]){
  const g=make(),t=g.actor;t.upgrades.sail=level;t.speed=Y.speed(level);t.cargo={};g.skipRemaining();
  assert.equal(t.speed,Y.speed(level)/2);g.skipRemaining();assert.equal(g.actor,t);assert.equal(g.state.distanceLeft,Y.speed(level)/2);
  const target=g.map.edges.find(e=>e.includes(t.position)).find(id=>id!==t.position),result=g.move(target);assert.ok(result);assert.equal(result.end*30,Y.speed(level)/2);
  g.continueTravel();assert.equal(t.speed,Y.speed(level)/2,'repeated hunger does not halve again');g.skipRemaining();
  t.cargo={6:100};g.skipRemaining();assert.equal(t.hungry,false);assert.equal(t.speed,Y.speed(level));
 }
});
test('fresh complete harvest and arrival at own port clear hunger without granting extra current-day distance',()=>{
 for(const first of [0,1]){
  const g=make(first),t=g.actor;t.upgrades.sail=3;g.setHungry(true);g.move(t.position);
  assert.equal(t.hungry,false);assert.equal(t.speed,40);assert.equal(g.state.distanceLeft,0);
 }
 for(const base of [1,24]){
  const g=make(base===1?1:0),t=g.actor;t.upgrades.sail=2;g.setHungry(true);t.position=g.map.edges.find(e=>e.includes(base)).find(id=>id!==base);g.state.distanceLeft=30;g.move(base);
  assert.equal(g.state.phase,'PORT');assert.equal(t.hungry,false);assert.equal(t.speed,30);assert.equal(t.hp,t.maxHp);assert.equal(g.state.distanceLeft,0);
 }
});
test('above-70-percent cargo gate remains; starvation bypasses armor and shield and can sink a ship',()=>{
 const g=make(),t=g.actor;t.hp=150;t.cargo={6:100};t.armor=100;t.shield=true;g.skipRemaining();assert.equal(t.hp,130);assert.equal(t.cargo[6],100);assert.equal(t.shield,true);
 const h=make(),a=h.actor;a.hp=5;a.cargo={6:8};h.skipRemaining();assert.equal(a.hp,0);assert.equal(h.state.phase,'RESULT');assert.equal(h.state.winner,1-a.id);
});
