'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),Y=require('../shipyard.js');
const questions=Array.from({length:12},(_,i)=>({text:'Retreat '+i,options:['A','B','C','D'],answer:0}));
function make(team=0){const g=new E.Game({questions,first:team,rng:()=>.3});g.leavePort();g.leavePort();return g;}
function attack(g,i=g.state.islands.find(i=>i.category==='combat')){g.actor.position=i.id;i.explored=true;g.state.phase='MAP';g.state.distanceLeft=0;g.arrive();assert.equal(g.state.phase,'ISLAND_BATTLE');return g.fightIsland();}
function dock(g,base){g.state.phase='MAP';g.state.distanceLeft=30;g.actor.transit=null;g.actor.position=g.map.edges.find(e=>e.includes(base)).find(id=>id!==base);assert.ok(g.move(base));assert.equal(g.state.phase,'PORT');}

test('a dangerous first battle stops at exactly 30 percent on both teams and all hull capacities',()=>{
 for(const team of [0,1])for(const maximum of [50,100,150,200]){
  const g=make(team),t=g.actor,i=g.state.islands.find(i=>i.category==='combat');t.hp=t.maxHp=maximum;
  const b=attack(g,i);if(maximum<=100){assert.equal(t.hp,maximum*.3);assert.equal(b.damageA,maximum*.7);assert.equal(b.retreated,true);assert.equal(g.state.phase,'REWARD');assert.equal(g.state.reward.type,'retreat');}else{assert.equal(t.hp,maximum-100);assert.equal(b.rounds.length,10);assert.equal(b.retreated,undefined);assert.equal(g.state.phase,'BATTLE');}
  assert.equal(i.defender.hp,500-b.rounds.length*5);assert.equal(b.damageB,500-i.defender.hp);assert.equal(t.monsterAttacksSinceRepair,1);assert.equal(g.state.winner,null);assert.equal(g.state.productReward,null);assert.deepEqual(t.loot,{});assert.equal(i.productCollectedBy,null);
  const before=JSON.stringify(g.state);assert.equal(g.fightIsland(),false);assert.equal(JSON.stringify(g.state),before);
 }
});

test('attacking again without a repair can sink the ship and keeps every hit on the island',()=>{
 const g=make(),i=g.state.islands.find(i=>i.category==='combat');attack(g,i);assert.equal(i.defender.hp,480);
 const b=attack(g,i);assert.equal(g.actor.hp,0);assert.equal(i.defender.hp,470);assert.equal(b.rounds.length,2);assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,1);assert.deepEqual(g.actor.loot,{});
});

test('either port resets only the repaired ship; island damage survives repairs, turns and repeated visits',()=>{
 for(const base of [1,24])for(const team of [0,1]){
  const g=make(team),t=g.actor,i=g.state.islands.find(i=>i.category==='combat');g.opponent.monsterAttacksSinceRepair=2;
  attack(g,i);g.continueReward();g.skipRemaining();assert.equal(g.actor.id,team);assert.equal(i.defender.hp,480);assert.equal(t.monsterAttacksSinceRepair,1);
  dock(g,base);assert.equal(t.hp,t.maxHp);assert.equal(t.monsterAttacksSinceRepair,0);assert.equal(g.opponent.monsterAttacksSinceRepair,2);assert.equal(i.defender.hp,480);
  assert.equal(attack(g,i).retreated,true);assert.equal(t.hp,15);assert.equal(i.defender.hp,460);
  // Returning and attacking the already damaged island never restores its health.
  dock(g,base);t.attack=500;attack(g,i);assert.equal(i.defender.hp,0);assert.equal(t.hp,50);assert.equal(t.loot[i.product],1);assert.equal(i.productCollectedBy,team);
 }
});

test('a second team fights the remaining island health, with its own first-attack protection',()=>{
 const g=make(),i=g.state.islands.find(i=>i.category==='combat');attack(g,i);g.state.active=1;attack(g,i);
 assert.equal(i.defender.hp,460);assert.deepEqual(g.state.teams.map(t=>t.hp),[15,15]);assert.deepEqual(g.state.teams.map(t=>t.monsterAttacksSinceRepair),[1,1]);
});

test('a fully upgraded legal ship can repair and finish a 500-health island over three ten-volley visits',()=>{
 const g=make(),t=g.actor,i=g.state.islands.find(i=>i.category==='combat');t.upgrades.hull=t.upgrades.cannon=3;t.hp=t.maxHp=200;t.attack=20;
 attack(g,i);assert.equal(t.hp,100);assert.equal(i.defender.hp,300);assert.equal(g.state.phase,'BATTLE');
 dock(g,24);assert.equal(t.hp,200);assert.equal(i.defender.hp,300);assert.equal(t.monsterAttacksSinceRepair,0);
 attack(g,i);assert.equal(t.hp,100);assert.equal(i.defender.hp,100);assert.deepEqual(t.loot,{});
 dock(g,24);attack(g,i);assert.equal(t.hp,160);assert.equal(i.defender.hp,0);assert.equal(g.state.reward.type,'product');assert.equal(t.loot[i.product],1);
 dock(g,24);const gold=t.gold;assert.ok(g.sellProduct(i.product));assert.equal(t.gold,gold+1000);assert.equal(i.defender.hp,0);assert.equal(i.productCollectedBy,0);
});

test('winnable battles continue below 30 percent, while forecasts respect armor and shields without consuming them',()=>{
 const g=make();g.actor.hp=g.actor.maxHp=100;g.actor.attack=50;const b=attack(g);assert.equal(g.actor.hp,10);assert.equal(b.retreated,undefined);assert.equal(g.state.reward.type,'product');
 const h=make(),i=h.state.islands.find(i=>i.category==='combat');h.actor.armor=10;h.actor.shield=true;const snapshot=JSON.stringify(h.state);assert.equal(h.monsterSafety(i.defender).protectedAttack,false);assert.equal(JSON.stringify(h.state),snapshot);assert.equal(attack(h,i).damageA,0);assert.equal(h.actor.shield,false);assert.equal(h.actor.hp,50);
 const j=make();j.actor.armor=3;j.actor.shield=true;const c=attack(j);assert.equal(c.rounds[0].blocked,true);assert.equal(j.actor.hp,15);assert.equal(c.damageA,35);
});

test('protection clips large hits and never heals a ship already below the 30 percent threshold',()=>{
 for(const hp of [50,10]){const g=make(),i=g.state.islands.find(i=>i.category==='combat');g.actor.hp=hp;i.defender.attack=999;const b=attack(g,i);assert.equal(g.actor.hp,Math.min(hp,15));assert.equal(b.rounds.length,1);assert.equal(i.defender.hp,495);}
});

test('Kraken has 1000 durability and 30 attack, preserves actual damage through retreat and repair',()=>{
 const g=make(),k=g.state.kraken,i=g.state.islands.find(i=>i.kind==='kraken');assert.deepEqual(k,{hp:1000,maxHp:1000,attack:30,damageBy:[0,0]});
 g.actor.hp=30;g.actor.position=i.id;g.state.phase='ENCOUNTER';g.encounter('explore');assert.equal(g.actor.hp,15);assert.equal(k.hp,995);assert.equal(g.state.reward.type,'retreat');assert.deepEqual(k.damageBy,[5,0]);
 dock(g,24);assert.equal(k.hp,995);assert.deepEqual(k.damageBy,[5,0]);assert.equal(g.actor.monsterAttacksSinceRepair,0);
 g.actor.hp=30;g.actor.position=i.id;g.state.phase='ENCOUNTER';g.encounter('explore');assert.equal(g.actor.hp,15);assert.equal(k.hp,990);
 g.state.phase='ENCOUNTER';g.encounter('explore');assert.equal(g.actor.hp,0);assert.equal(k.hp,985);assert.equal(g.state.phase,'RESULT');assert.deepEqual(k.damageBy,[15,0]);
});

test('PvP stays lethal and does not consume the monster attack count',()=>{
 const g=make();g.actor.hp=5;g.actor.position=2;g.opponent.position=2;g.opponent.attack=10;g.state.phase='ENCOUNTER';g.fight();assert.equal(g.actor.hp,0);assert.equal(g.state.phase,'RESULT');assert.equal(g.actor.monsterAttacksSinceRepair,0);
});

test('all five upgrades charge 100, 500, 1000 and reject insufficient gold without changes',()=>{
 assert.deepEqual([0,1,2,3].map(Y.upgradeCost),[100,500,1000,null]);
 for(const team of [0,1])for(const kind of ['hull','cannon','sail','cargo','provisions'])for(const [level,cost] of [[0,100],[1,500],[2,1000]]){
  const g=new E.Game({questions,first:team});g.actor.upgrades.hull=kind==='hull'?level:3;g.actor.upgrades[kind]=level;g.actor.gold=cost-1;
  const before=JSON.stringify(g.state);assert.equal(g.upgrade(kind),false);assert.equal(JSON.stringify(g.state),before);assert.match(g.upgradeStatus(kind).reason,/Thiếu 1 vàng/);
  g.actor.gold=cost;assert.equal(g.upgradeStatus(kind).cost,cost);assert.ok(g.upgrade(kind));assert.equal(g.actor.gold,0);assert.equal(g.actor.upgrades[kind],level+1);assert.match(g.state.notice,new RegExp('−'+cost+' vàng'));
 }
});
