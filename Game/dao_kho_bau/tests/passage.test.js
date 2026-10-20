'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),T=require('../trade.js');
const questions=Array.from({length:12},(_,i)=>({text:'Passage '+i,options:['A','B','C','D'],answer:0}));
function make(){const g=new E.Game({questions});g.leavePort();g.leavePort();return g;}
function neighbor(g){return g.map.edges.filter(e=>e.includes(g.actor.position)).flat().find(id=>id!==g.actor.position&&!g.state.islands[id-1].start);}
function grant(g,id){const prompt=g.move(id);assert.equal(prompt.question,true);g.answer(0);g.continueAnswer();return g.move(id);}
function nextDay(g){g.continueTravel();assert.equal(g.actor.id,1);g.skipRemaining();assert.equal(g.actor.id,0);}

test('an unexplored destination asks before any movement and wrong answers forfeit the day without granting access or loot',()=>{
 const g=make(),from=g.actor.position,id=neighbor(g),t=g.actor;const result=g.move(id);
 assert.equal(result.question,true);assert.equal(g.state.phase,'QUESTION');assert.equal(t.position,from);assert.equal(t.transit,null);assert.equal(g.state.questionIsland,id);assert.equal(g.state.distanceLeft,10);assert.equal(T.cargoCount(t),0);assert.equal(g.state.islands[id-1].explored,false);
 g.answer(1);assert.equal(t.position,from);g.continueAnswer();assert.equal(t.position,from);assert.equal(t.transit,null);assert.equal(t.turns,1);assert.equal(t.gold,50);assert.equal(g.actor.id,1);assert.equal(g.state.islands[id-1].explored,false);
 g.skipRemaining();assert.equal(g.move(id).question,true);assert.equal(g.state.islands[id-1].attempts,2);
});
test('one correct answer permits a multi-day trip; discovery and harvesting occur only upon arrival',()=>{
 const g=make(),id=g.map.edges.filter(e=>e.includes(g.actor.position)).flat().find(id=>g.state.islands[id-1].rarity==='common'),from=g.actor.position,t=g.actor;
 assert.equal(g.move(id).question,true);g.answer(0);
 assert.equal(t.gold,100);assert.equal(g.state.goldDelta,0);assert.equal(g.state.history[0].goldDelta,0);assert.equal(t.position,from);assert.equal(t.transit,null);assert.equal(g.state.islands[id-1].explored,false);
 g.continueAnswer();assert.equal(t.travelPermit,id);assert.equal(g.state.phase,'MAP');assert.equal(t.position,from);assert.equal(t.gold,100);
 g.move(id);assert.equal(t.position,from);assert.equal(t.transit.travelled,10);assert.equal(g.state.islands[id-1].explored,false);assert.equal(T.cargoCount(t),0);assert.equal(g.state.history.length,1);
 nextDay(g);assert.equal(g.move(id).question,undefined);assert.equal(t.transit.travelled,20);nextDay(g);g.move(id);
 assert.equal(t.position,id);assert.equal(t.transit,null);assert.equal(g.state.phase,'REWARD');assert.equal(g.state.islands[id-1].explored,true);assert.equal(g.state.productReward.harvested,25);assert.equal(g.state.productReward.quantity,g.island.edible?5:25);assert.equal(g.state.history.length,1);assert.equal(t.gold,100);
 g.continueReward();g.skipRemaining();g.move(id);assert.equal(g.state.phase,'REWARD');assert.equal(g.state.history.length,1);assert.equal(T.cargoCount(t),g.island.edible?10:50);assert.equal(t.gold,100);
});
test('a previously discovered island is shared knowledge and gives no new movement question or gold',()=>{
 const g=make(),id=neighbor(g);g.state.islands[id-1].explored=true;g.state.islands[id-1].owner=1;g.move(id);
 assert.equal(g.state.phase,'TRAVEL');assert.equal(g.state.history.length,0);assert.equal(g.actor.gold,100);
});
test('a failed destination answer outside base still pays the daily supply cost, never movement',()=>{
 const g=make();g.actor.position=neighbor(g);g.island.explored=true;g.actor.voyageDays=3;const from=g.actor.position,t=g.actor,id=neighbor(g);
 g.move(id);g.answer(1);g.continueAnswer();assert.equal(t.position,from);assert.equal(t.transit,null);assert.equal(t.hp,30);assert.equal(t.voyageDays,4);assert.equal(g.state.islands[id-1].explored,false);
});
test('a ship 20 miles out needs 20 miles to return and cannot switch to a third island mid-edge',()=>{
 const g=make(),from=g.actor.position,id=neighbor(g),t=g.actor;grant(g,id);nextDay(g);g.move(id);nextDay(g);
 assert.equal(t.transit.travelled,20);assert.equal(g.canMove(from),true);const other=g.map.edges.filter(e=>e.includes(from)).flat().find(n=>n!==from&&n!==id);assert.equal(g.canMove(other),false);
 const reverse=g.move(from);assert.equal(reverse.from,id);assert.equal(reverse.to,from);assert.equal(reverse.start,1/3);assert.equal(reverse.end,2/3);assert.equal(reverse.arrived,false);assert.equal(t.transit.to,from);assert.equal(t.transit.travelled,20);
 nextDay(g);g.move(from);assert.equal(t.position,from);assert.equal(t.transit,null);assert.equal(g.state.phase,'PORT');assert.equal(t.totalDays,4);assert.equal(t.voyageDays,0);assert.equal(g.state.islands[id-1].explored,false);assert.equal(g.state.history.length,1);
});
test('turning around twice preserves physical position and charges each mile with no teleport or refund',()=>{
 const g=make(),from=g.actor.position,id=neighbor(g),t=g.actor;grant(g,id);nextDay(g);g.move(id);nextDay(g);g.move(from);nextDay(g);
 const result=g.move(id);assert.equal(result.start,1/3);assert.equal(result.end,2/3);assert.equal(result.arrived,false);assert.equal(t.transit.to,id);assert.equal(t.transit.travelled,20);assert.equal(t.totalDays,4);assert.equal(g.state.history.length,1);
});
test('reversing with a faster next-day budget uses only the return distance and leaves the rest available at port',()=>{
 const g=make(),from=g.actor.position,id=neighbor(g),t=g.actor;grant(g,id);t.speed=40;nextDay(g);const result=g.move(from);
 assert.equal(result.start,2/3);assert.equal(result.end,1);assert.equal(g.state.distanceLeft,30);assert.equal(t.position,from);assert.equal(g.state.phase,'PORT');
});
