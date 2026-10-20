'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {Game,ISLANDS,EDGES,adjacent,validateQuestions}=require('../engine.js');
const Y=require('../shipyard.js');
const questions=Array.from({length:12},(_,i)=>({text:'Câu '+i,options:['A','B','C','D'],answer:0}));
function make(first=0,rng=()=>.3){return new Game({questions,first,rng});}
function launch(g){assert.ok(g.leavePort());assert.ok(g.leavePort());assert.equal(g.state.phase,'MAP');return g;}
function at(g,id,purpose='island'){g.actor.position=id;g.island.explored=true;g.state.distanceLeft=0;g.state.phase=purpose==='island'?'MAP':'ENCOUNTER';if(purpose==='island')g.arrive();else g.encounter(purpose==='duel'?'duel':'explore');}
const normal=g=>g.state.islands.find(i=>!i.start&&i.kind==='island').id;

test('24 connected destinations, three neighbors each, fixed bases clear of encounters',()=>{
 assert.equal(ISLANDS.length,24);assert.equal(EDGES.length,36);assert.ok(adjacent(1,24));
 for(const i of ISLANDS)assert.equal(EDGES.filter(e=>e.includes(i.id)).length,3);
 const seen=new Set([1]);for(let n=0;n<24;n++)for(const[a,b]of EDGES){if(seen.has(a))seen.add(b);if(seen.has(b))seen.add(a);}assert.equal(seen.size,24);
 for(const b of Y.BASES)assert.equal(ISLANDS.find(i=>i.id===b.id).kind,'island');
});
test('both teams start at their own base with 100 gold and zero equipment levels',()=>{
 for(const first of [0,1]){const g=make(first);assert.equal(g.state.phase,'PORT');assert.equal(g.actor.id,first);
  for(const t of g.state.teams){assert.equal(t.position,t.id?1:24);assert.equal(t.gold,100);assert.deepEqual(t.upgrades,{hull:0,cannon:0,sail:0,cargo:0,provisions:0});assert.equal(t.hp,50);assert.equal(t.attack,5);assert.equal(t.speed,10);}
  assert.equal(g.move(2),false);g.leavePort();assert.equal(g.actor.id,1-first);assert.equal(g.state.phase,'PORT');g.leavePort();assert.equal(g.state.phase,'MAP');assert.equal(g.actor.id,first);assert.equal(g.state.turn,1);
 }
});
test('each match has three clue sites and no chest until two clues are found',()=>{
 const g=make(),rest=g.state.islands.filter(i=>i.kind==='island'&&!i.start);
 assert.equal(rest.length,21);assert.equal(rest.filter(i=>i.effectId==='search').length,3);assert.equal(g.state.treasure.location,null);assert.equal(g.state.treasure.claimedBy,null);
 assert.equal(rest.filter(i=>i.category==='harvest').length,10);assert.equal(rest.filter(i=>i.category==='combat').length,8);
 assert.ok(g.state.islands.every(i=>(i.effectId==='search')===(i.category==='treasure')));
});
test('all 30 legal combinations per team are reachable at the 100/500/1000 gold level costs',()=>{
 assert.equal(Y.variants.length,60);assert.equal(new Set(Y.variants.map(v=>v.file)).size,60);
 for(const v of Y.variants){const g=make(v.team);g.actor.gold=4800;for(const key of ['hull','cannon','sail'])for(let i=0;i<v[key];i++)assert.ok(g.upgrade(key));assert.deepEqual(g.actor.upgrades,{hull:v.hull,cannon:v.cannon,sail:v.sail,cargo:0,provisions:0});assert.equal(g.actor.gold,4800-[0,100,600,1600][v.hull]-[0,100,600,1600][v.cannon]-[0,100,600,1600][v.sail]);assert.equal(g.actor.maxHp,50+50*v.hull);assert.equal(g.actor.attack,5+5*v.cannon);assert.equal(g.actor.speed,10+10*v.sail);assert.equal(Y.filename(v.team,g.actor.upgrades),v.file);}
});
test('upgrade guard rejects insufficient funds, invalid types, capacity overflow and level four without mutation',()=>{
 const g=make();for(const kind of ['cannon','sail','unknown','__proto__']){const before=JSON.stringify(g.state);assert.equal(g.upgrade(kind),false);assert.equal(JSON.stringify(g.state),before);}
 assert.ok(g.upgrade('hull'));assert.equal(g.actor.gold,0);assert.equal(g.upgrade('hull'),false);assert.equal(g.upgrade('cannon'),false);
 g.actor.gold=4800;for(let i=0;i<2;i++)g.upgrade('hull');for(const k of ['cannon','sail'])for(let i=0;i<3;i++)assert.ok(g.upgrade(k));
 for(const k of ['hull','cannon','sail'])assert.equal(g.upgrade(k),false);launch(g);const before=JSON.stringify(g.state);assert.equal(g.upgrade('hull'),false);assert.equal(JSON.stringify(g.state),before);
 assert.equal(Y.valid({hull:1,cannon:3,sail:0}),false);assert.throws(()=>Y.filename(0,{hull:1,cannon:3,sail:0}));
});
test('correct answers preserve gold; wrong answers halve current gold with floor rounding',()=>{
 for(const [initial,answer,expected]of [[100,0,100],[0,0,0],[75,0,75],[150,1,75],[75,2,37],[1,3,0],[0,1,0]]){
  const g=launch(make());g.actor.gold=initial;g.askDestination(normal(g));assert.ok(g.answer(answer));assert.equal(g.actor.gold,expected);assert.equal(g.state.goldDelta,expected-initial);const before=JSON.stringify(g.state);assert.equal(g.answer(0),false);assert.equal(JSON.stringify(g.state),before);
 }
});
test('wrong answer preserves chest contents and stats, ends the action and penalizes only answering team',()=>{
 const g=launch(make()),id=g.state.islands.find(i=>i.category==='treasure').id;g.askDestination(id);g.answer(1);g.continueAnswer();assert.equal(g.state.active,1);assert.equal(g.state.teams[0].gold,50);assert.equal(g.state.teams[1].gold,100);assert.equal(g.state.teams[0].hp,50);assert.equal(g.state.islands[id-1].explored,false);
});
test('Whale is common harvesting, has no special lottery or stat bonus and yields 25 units once per day at hull Lv0',()=>{
 const g=launch(make()),common=g.map.islands.find(i=>require('../island-rules.js').theme(i.themeId).rarity==='common'&&![2,3,22,23].includes(i.id));
 const map={...g.map,islands:g.map.islands.map(i=>({...i,themeId:i.id===common.id?24:i.themeId}))};
 const existing=map.islands.find(i=>i.id!==common.id&&i.themeId===24);if(existing)existing.themeId=common.themeId;
 const h=launch(new Game({questions,map})),id=common.id;h.actor.hp=2;at(h,id);
 assert.equal(h.island.category,'harvest');assert.equal(h.island.kind,'island');assert.equal(h.island.product,24);
 assert.equal(h.actor.cargo[24],25);assert.equal(h.actor.hp,2);assert.equal(h.actor.attack,5);assert.equal(h.actor.gold,100);
 assert.equal(h.state.phase,'REWARD');assert.equal(h.canExplore(),false);
});
test('landing at own base always opens the yard before any co-located enemy encounter',()=>{
 for(const base of [1,24]){const first=base===1?1:0,g=launch(make(first)),near=g.map.edges.find(e=>e.includes(base)).find(id=>id!==base);g.actor.position=near;g.opponent.position=base;g.actor.speed=30;g.state.distanceLeft=30;assert.ok(g.move(base));assert.equal(g.state.phase,'PORT');assert.equal(g.state.active,first);g.leavePort();assert.equal(g.state.phase,'MAP');assert.equal(g.state.active,1-first);}
});
test('upgrades while docked cannot add free distance mid-day; the new speed applies next day',()=>{
 const g=launch(make());g.actor.position=24;g.opponent.position=2;g.actor.gold=4800;g.state.phase='PORT';g.state.distanceLeft=10;g.upgrade('hull');g.upgrade('sail');g.leavePort();assert.equal(g.state.phase,'MAP');assert.equal(g.state.distanceLeft,10);g.skipRemaining();
 g.skipRemaining();assert.equal(g.actor.id,0);assert.equal(g.state.distanceLeft,20);
});
test('sail level three provides 40 nautical miles per day at launch and can end remaining movement early',()=>{
 const g=make();g.actor.gold=4800;for(let i=0;i<3;i++)g.upgrade('hull');for(let i=0;i<3;i++)g.upgrade('sail');launch(g);assert.equal(g.state.distanceLeft,40);assert.ok(g.skipRemaining());assert.equal(g.actor.id,1);assert.equal(g.state.turn,2);
});
test('Kraken retaliation sinks an unprotected ship with five durability left; killing Kraken never retaliates',()=>{
 let g=launch(make()),id=g.state.islands.find(i=>i.kind==='kraken').id;g.actor.hp=5;g.actor.monsterAttacksSinceRepair=1;at(g,id,'kraken');assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,1);assert.equal(g.state.teams[0].hp,0);assert.equal(g.state.kraken.hp,995);
 g=launch(make());g.state.kraken.hp=1;at(g,id,'kraken');assert.equal(g.state.winner,0);assert.equal(g.state.teams[0].hp,50);
});
test('destroyed opponent cannot counterattack and result locks purchases/answers/movement',()=>{
 const g=launch(make());g.opponent.hp=1;g.actor.position=2;g.opponent.position=2;at(g,2,'duel');assert.equal(g.state.phase,'RESULT');assert.equal(g.state.winner,0);assert.equal(g.state.teams[0].hp,50);assert.equal(g.answer(0),false);assert.equal(g.move(1),false);assert.equal(g.upgrade('hull'),false);assert.equal(g.leavePort(),false);
});
test('new match resets all gold, equipment, discoveries and turn state',()=>{const g=make();g.upgrade('hull');const fresh=make();assert.equal(fresh.actor.gold,100);assert.equal(fresh.actor.upgrades.hull,0);assert.equal(fresh.state.turn,1);assert.equal(fresh.state.history.length,0);});
test('question input remains bounded and validated',()=>{assert.throws(()=>validateQuestions([]));assert.throws(()=>validateQuestions(questions.map(q=>({...q,answer:4}))));assert.equal(validateQuestions(questions).length,12);});
test('visual upgrades use one to four ports and one small or large main sail before adding rear and front masts',()=>{
 assert.deepEqual([0,1,2,3].map(Y.cannonCount),[1,2,3,4]);
 assert.deepEqual([0,1,2,3].map(Y.gunportCount),[1,2,3,4]);
 assert.deepEqual([0,1,2,3].map(Y.mastCount),[1,1,2,3]);
 assert.equal(Y.sailDescriptions[0],'1 cột buồm chính nhỏ');
 assert.equal(Y.sailDescriptions[1],'1 cột buồm chính lớn');
 assert.equal(Y.sailDescriptions[2],'Buồm chính lớn + buồm sau (2 cột)');
 assert.equal(Y.sailDescriptions[3],'Buồm chính lớn + buồm sau + buồm trước (3 cột)');
 for(const v of Y.variants)assert.equal(Y.gunportCount(v.hull)-Y.cannonCount(v.cannon),v.hull-v.cannon);
});
