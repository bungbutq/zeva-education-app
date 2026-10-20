'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),E=require('../engine.js');
const questions=Array.from({length:12},(_,i)=>({text:'Duel '+i,options:['A','B','C','D'],answer:0}));
const leg=E.EDGES.find(e=>e.every(id=>![1,24].includes(id)));
function make(first=0){const g=new E.Game({questions,first});g.leavePort();g.leavePort();g.state.islands.forEach(i=>i.explored=true);for(const t of g.state.teams){t.hp=t.maxHp=200;t.attack=5;t.upgrades.hull=3;t.upgrades.sail=2;t.speed=30;}g.state.distanceLeft=30;g.actor.position=leg[0];g.opponent.position=leg[1];return g;}
test('landing on the other ship automatically queues ten volleys per side and ends the moving day',()=>{
 for(const first of [0,1]){const g=make(first),a=g.actor,b=g.opponent;const move=g.move(b.position);assert.equal(move.duel,true);assert.equal(g.state.phase,'DUEL_BATTLE');assert.equal(a.hp,200);const battle=g.fight();assert.equal(battle.shotsA,10);assert.equal(battle.shotsB,10);assert.equal(battle.rounds.length,10);assert.equal(a.hp,150);assert.equal(b.hp,150);assert.equal(g.state.distanceLeft,0);assert.equal(g.fight(),false);g.continueBattle();assert.equal(g.actor,b);assert.equal(a.turns,1);assert.equal(b.turns,0);}
});
test('opposite-direction ships stop at the meeting point on their shared edge',()=>{
 const g=make(),a=g.actor,b=g.opponent;b.position=leg[1];b.transit={from:leg[1],to:leg[0],travelled:10};const unchanged=JSON.stringify(b.transit);const move=g.move(leg[1]);
 assert.equal(move.arrived,false);assert.equal(move.end,2/3);assert.equal(a.transit.travelled,20);assert.equal(JSON.stringify(b.transit),unchanged);assert.equal(g.state.phase,'DUEL_BATTLE');assert.equal(g.fight().shotsB,10);
});
test('catching a ship travelling in the same direction also triggers combat, but no combat before reaching it',()=>{
 for(const distance of [10,15,30]){const g=make(),b=g.opponent;b.position=leg[0];b.transit={from:leg[0],to:leg[1],travelled:15};g.state.distanceLeft=distance;g.move(leg[1]);assert.equal(g.state.phase,distance<15?'TRAVEL':'DUEL_BATTLE');assert.equal(g.actor.transit.travelled,Math.min(distance,15));}
});
test('different routes do not collide and a ship can leave a previous meeting point without immediate duplicate combat',()=>{
 const g=make(),b=g.opponent;const other=E.EDGES.find(e=>e.every(id=>!leg.includes(id)));b.position=other[0];b.transit={from:other[0],to:other[1],travelled:15};g.state.distanceLeft=10;g.move(leg[1]);assert.equal(g.state.phase,'TRAVEL');
 const h=make();h.actor.transit={from:leg[0],to:leg[1],travelled:15};h.opponent.position=leg[0];h.opponent.transit={from:leg[0],to:leg[1],travelled:15};h.state.distanceLeft=5;h.move(leg[1]);assert.equal(h.state.phase,'TRAVEL');assert.equal(h.actor.transit.travelled,20);
});
test('both starting islands are safe, even when both ships are present; waters outside remain combat zones',()=>{
 for(const base of [1,24]){const g=make();g.actor.position=E.EDGES.find(e=>e.includes(base)).find(id=>id!==base);g.opponent.position=base;g.move(base);assert.equal(g.state.phase,'PORT');assert.equal(g.enemyHere,false);assert.equal(g.fight(),false);assert.equal(g.opponent.hp,200);}
 const g=make(),to=E.EDGES.find(e=>e.includes(1)&&!e.includes(24)).find(id=>id!==1);g.actor.position=1;g.opponent.position=to;g.opponent.transit={from:to,to:1,travelled:10};g.move(to);assert.equal(g.state.phase,'DUEL_BATTLE');
});
test('a sunk ship never fires back and no further volleys occur after either ship sinks',()=>{
 const g=make();g.opponent.hp=5;g.move(g.opponent.position);const first=g.fight();assert.deepEqual([first.shotsA,first.shotsB],[1,0]);assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,g.actor.id);
 const h=make();h.actor.hp=5;h.move(h.opponent.position);const counter=h.fight();assert.deepEqual([counter.shotsA,counter.shotsB],[1,1]);assert.equal(h.state.phase,'RESULT');assert.equal(h.state.winner,h.opponent.id);
});
