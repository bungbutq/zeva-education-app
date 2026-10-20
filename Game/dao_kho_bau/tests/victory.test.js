"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js');
const questions=Array.from({length:12},(_,i)=>({text:'Victory '+i,options:['A','B','C','D'],answer:0}));
function make(first=0){const g=new E.Game({questions,first});g.leavePort();g.leavePort();return g;}
function hit(g,team,attack){g.state.active=team;g.actor.position=g.state.islands.find(i=>i.kind==='kraken').id;g.actor.attack=attack;g.state.phase='ENCOUNTER';g.encounter('explore');}

test('both starting orders receive 60 complete turns; only unspent gold decides the deadline',()=>{
 for(const first of [0,1]){
  const g=make(first);g.state.teams[0].gold=120;g.state.teams[0].cargo={9:100};g.state.teams[0].chests=7;g.state.teams[1].gold=121;
  for(let turn=0;turn<119;turn++){assert.ok(g.skipRemaining());assert.equal(g.state.phase,'MAP');}
  assert.equal(g.actor.id,1-first);assert.equal(g.actor.turns,59);assert.equal(g.opponent.turns,60);
  assert.ok(g.skipRemaining());assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,1);assert.deepEqual(g.state.teams.map(t=>t.turns),[60,60]);assert.match(g.state.reason,/Vàng đang giữ/);assert.equal(g.skipRemaining(),false);
 }
});

test('an upgrade bought on the last turn reduces the gold compared at the deadline',()=>{
 const g=make();g.state.teams.forEach(t=>t.turns=59);g.actor.gold=200;g.opponent.gold=150;g.state.phase='PORT';assert.ok(g.upgrade('hull'));assert.equal(g.actor.gold,100);g.state.portInitial=false;g.leavePort();g.skipRemaining();g.skipRemaining();assert.equal(g.state.winner,1);
});

test('equal gold draws and all post-result actions remain locked',()=>{
 const g=make();g.state.teams.forEach(t=>t.turns=59);g.skipRemaining();g.skipRemaining();assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,null);assert.match(g.state.reason,/hòa/);
 const state=JSON.stringify(g.state);for(const action of [()=>g.move(1),()=>g.upgrade('hull'),()=>g.skipRemaining(),()=>g.fightKraken(),()=>g.fight(),()=>g.openChest(),()=>g.digTreasure()])assert.equal(action(),false);g.checkWinner();assert.equal(JSON.stringify(g.state),state);
});

test('Kraken victory uses cumulative actual damage across visits, not the final hitter or overkill',()=>{
 const g=make();g.state.teams.forEach(t=>t.hp=t.maxHp=1000);hit(g,0,70);const hp=g.state.teams[1].hp;hit(g,1,2000);
 assert.deepEqual(g.state.kraken.damageBy,[700,300]);assert.equal(g.state.winner,0);assert.equal(g.state.kraken.hp,0);assert.equal(g.state.teams[1].hp,hp,'dead Kraken cannot retaliate');assert.equal(g.state.phase,'RESULT');
});

test('equal Kraken damage compares current gold, then draws when gold is also equal',()=>{
 for(const [gold,winner]of [[101,0],[99,1],[100,null]]){
  const g=make();g.state.teams[0].gold=gold;g.state.teams.forEach(t=>t.hp=t.maxHp=1000);hit(g,0,50);hit(g,1,2000);assert.deepEqual(g.state.kraken.damageBy,[500,500]);assert.equal(g.state.winner,winner);assert.equal(g.state.phase,'RESULT');assert.match(g.state.reason,/Sát thương bằng nhau/);
 }
});

test('destruction, including final-day exhaustion, overrides gold and Kraken damage',()=>{
 const g=make();g.state.teams.forEach(t=>t.turns=59);g.skipRemaining();g.actor.position=g.state.islands.find(i=>i.category==='harvest').id;g.actor.voyageDays=3;g.actor.hp=5;g.actor.gold=9000;g.state.kraken.damageBy[1]=8;
 g.skipRemaining();assert.equal(g.state.winner,0);assert.equal(g.state.teams[1].hp,0);assert.match(g.state.reason,/hết độ bền/);
});
