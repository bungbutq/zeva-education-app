"use strict";
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),T=require('../trade.js');
const questions=Array.from({length:12},(_,i)=>({text:'Treasure '+i,options:['A','B','C','D'],answer:0}));
function make(first=0,rng=()=>.3){const g=new E.Game({questions,first,rng});g.state.teams.forEach(t=>t.upgrades.provisions=3);g.leavePort();g.leavePort();g.state.islands.forEach(i=>i.explored=true);return g;}
function search(g,id){g.actor.position=id;assert.ok(g.move(id));if(g.state.phase==='ENCOUNTER')g.encounter('explore');}
function nextDay(g){const team=g.actor.id;g.continueReward();assert.equal(g.actor.id,1-team);g.skipRemaining();assert.equal(g.actor.id,team);}
function collectClues(g){for(const site of g.state.islands.filter(i=>i.category==='treasure').slice(0,2)){for(let day=1;day<=3;day++){search(g,site.id);nextDay(g);}}}

test('three-day searches award two distinct clues, with no chest or gold before the second clue',()=>{
 const g=make(),h=g.state.treasure,t=g.actor,sites=g.state.islands.filter(i=>i.category==='treasure');
 assert.equal(sites.length,3);assert.equal(h.location,null);assert.equal(E.TREASURE_DAYS,3);assert.equal(E.TREASURE_CLUES,2);
 for(let site=0;site<2;site++)for(let day=1;day<=3;day++){
  search(g,sites[site].id);assert.equal(h.progress[0][sites[site].id],day);assert.equal(t.gold,100);assert.equal(T.cargoCount(t),0);assert.equal(g.state.distanceLeft,0);assert.equal(g.searchTreasure(),false);assert.equal(g.openChest(),false);
  assert.equal(h.clues[0].length,site+(day===3?1:0));if(site===0||day<3)assert.equal(h.location,null);
  nextDay(g);
  if(day===3&&site===0){assert.equal(g.canExplore(),false);assert.equal(g.move(sites[0].id),false);}
 }
 assert.equal(h.owner,0);assert.equal(t.totalDays,6);assert.equal(g.state.history.length,0);assert.ok(h.location>=17&&h.location<=23);
});

test('first team to two clues spawns exactly one chest across all seven non-base slots of its home region',()=>{
 for(const team of [0,1]){
  const seen=new Set();for(let n=0;n<7;n++){
   const g=make(team,()=>((n+.1)/7));collectClues(g);const h=g.state.treasure;seen.add(h.location);
   assert.equal(h.owner,team);assert.equal(h.claimedBy,null);assert.equal(g.treasureIntel(h.location),'marked');assert.equal(g.treasureIntel(h.location,1-team),null);
   const location=h.location;g.skipRemaining();g.actor.position=g.state.islands.find(i=>i.category==='treasure').id;assert.equal(g.searchTreasure(),false);assert.equal(g.digTreasure(),false);assert.equal(h.location,location);
  }
  assert.deepEqual([...seen],team?[2,3,4,5,6,7,8]:[17,18,19,20,21,22,23]);
 }
});

test('arrival and digging are separate days, chest pays 3000 once without a cargo or stat effect',()=>{
 const g=make();collectClues(g);const t=g.actor,h=g.state.treasure,id=h.location;
 t.position=g.map.edges.find(e=>e.includes(id)).find(n=>n!==id);t.speed=40;g.state.distanceLeft=40;
 const beforeDay=t.totalDays,beforeCargo={...t.cargo};assert.ok(g.move(id));assert.equal(g.state.reward.type,'treasure-arrival');assert.equal(t.totalDays,beforeDay+1);assert.equal(g.digTreasure(),false);assert.equal(g.openChest(),false);assert.equal(t.gold,100);assert.deepEqual(t.cargo,beforeCargo);
 nextDay(g);assert.ok(g.move(id));assert.equal(t.totalDays,beforeDay+2);assert.equal(g.state.phase,'CHEST');assert.equal(g.state.distanceLeft,0);
 const stats={hp:t.hp,attack:t.attack,speed:t.speed,maxHp:t.maxHp};assert.ok(g.openChest());assert.equal(t.gold,3100);assert.equal(t.chests,1);assert.equal(h.claimedBy,0);assert.deepEqual({hp:t.hp,attack:t.attack,speed:t.speed,maxHp:t.maxHp},stats);assert.equal(g.openChest(),false);assert.equal(g.state.winner,null);
 assert.equal(g.treasureIntel(id),'claimed');assert.equal(g.treasureIntel(id,1),null);assert.equal(g.island.opened,false,'no public grayscale reveals chest location');
 nextDay(g);assert.equal(g.digTreasure(),false);assert.equal(t.gold,3100);
});

test('progress is per team, persists after leaving and works with a full hold',()=>{
 const g=make(),id=g.state.islands.find(i=>i.category==='treasure').id;g.actor.cargo={9:100};search(g,id);assert.equal(g.state.treasure.progress[0][id],1);g.continueReward();
 g.opponent.position=24;search(g,id);assert.equal(g.state.treasure.progress[1][id],1);g.continueReward();
 g.actor.position=24;g.skipRemaining();g.actor.position=1;g.skipRemaining();
 search(g,id);assert.equal(g.state.treasure.progress[0][id],2);assert.equal(g.state.treasure.progress[1][id],1);assert.equal(T.cargoCount(g.actor),100);
});
