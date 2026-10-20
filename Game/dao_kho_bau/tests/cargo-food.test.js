'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../engine.js'),T=require('../trade.js');
const questions=Array.from({length:12},(_,i)=>({text:'Food '+i,options:['A','B','C','D'],answer:0}));
function make(first=0){const g=new E.Game({questions,first});g.leavePort();g.leavePort();g.state.islands.forEach(i=>i.explored=true);return g;}
function place(g){g.state.teams.forEach((t,id)=>{t.position=g.state.islands.filter(i=>i.category==='harvest'&&i.edible)[id].id;t.voyageDays=3;t.hp=35;t.cargo={6:100};});}
function harvest(g){assert.ok(g.move(g.actor.position));if(g.state.phase==='ENCOUNTER')g.encounter('explore');assert.equal(g.state.phase,'REWARD');}

test('both starting orders alternate two independent cargo rations: 20, 25, 32, then insufficient 40',()=>{
 for(const first of [0,1]){
  const g=make(first);place(g);
  for(const [required,next,left] of [[20,25,80],[25,32,55],[32,40,23]])for(let n=0;n<2;n++){
   const t=g.actor,other=g.opponent,before=JSON.stringify(other);
   assert.equal(T.cargoFoodRequired(t),required);assert.equal(T.daySupply(t).foodNeeded,required);
   for(let k=0;k<3;k++)T.daySupply(t);
   assert.equal(T.cargoFoodRequired(t),required,'previews never advance consumption');
   g.skipRemaining();assert.equal(t.hp,35);assert.equal(t.cargo[6],left);assert.equal(T.cargoFoodRequired(t),next);
   assert.equal(JSON.stringify(other),before,'only the acting ship eats');
  }
  for(let n=0;n<2;n++){const t=g.actor;g.skipRemaining();assert.equal(t.hp,18);assert.equal(t.cargo[6]||0,0);assert.equal(T.cargoFoodRequired(t),50,'partial cargo meals also increase the next ration');}
 }
});

test('both teams pay fresh meals before cargo storage and refill provisions only with overflow',()=>{
 for(const first of [0,1]){
  const g=make(first);place(g);
  for(const t of g.state.teams){t.upgrades.hull=1;t.maxHp=100;t.hp=100;t.cargo={12:80};t.cargoMealRation=32;}
  for(let n=0;n<4;n++){
   const t=g.actor,other=g.opponent,before=JSON.stringify(other);harvest(g);
   assert.deepEqual([g.state.productReward.harvested,g.state.productReward.dailyFood,g.state.productReward.quantity,g.state.productReward.reserveFood],n<2?[50,20,20,10]:[50,20,0,30]);
   assert.equal(T.cargoCount(t),100);assert.equal(T.remainingDays(t),n<2?.5:2);
   g.continueReward();assert.equal(t.hp,100);assert.equal(T.remainingDays(t),n<2?.5:2);assert.equal(T.cargoFoodRequired(t),32,'fresh harvest does not increase or reset cargo ration');
   assert.equal(JSON.stringify(other),before);
  }
 }
});

test('fresh meals combine with fractional reserve and the increased cargo rate for only the missing fraction',()=>{
 for(const teamId of [0,1]){
  const g=make(teamId);place(g);const t=g.actor;t.upgrades.cargo=3;t.cargoMealRation=63;t.provisionCredit=.2;t.cargo={6:19,16:5};
  harvest(g);assert.equal(t.dayFood,25);const supply=T.daySupply(t);
  assert.equal(supply.ration,50);assert.equal(supply.reserveUsed,.2);assert.equal(supply.foodNeeded,19,'30% of 63 rounded up');
  g.continueReward();assert.equal(t.hp,35);assert.deepEqual(t.cargo,{16:5});assert.equal(T.cargoFoodRequired(t),79);
 }
});

test('normal reserve days retain the higher ration and do not consume cargo or affect the other team',()=>{
 const g=make();place(g);
 for(const t of g.state.teams){t.cargoMealRation=40;t.voyageDays=2;}
 for(let n=0;n<2;n++){const t=g.actor;g.skipRemaining();assert.equal(t.hp,35);assert.equal(t.cargo[6],100);assert.equal(T.cargoFoodRequired(t),40);}
 for(let n=0;n<2;n++){const t=g.actor;g.skipRemaining();assert.equal(t.hp,35);assert.equal(t.cargo[6],60);assert.equal(T.cargoFoodRequired(t),50);}
});

test('actual sailing loses the food deficit at 80%, then consumes cargo below 70% for either team',()=>{
 for(const first of [0,1]){
  const g=make(first),t=g.actor;t.voyageDays=3;t.hp=40;t.cargo={6:100};
  const to=g.map.edges.find(e=>e.includes(t.position)&&!e.includes(first?24:1)).find(id=>id!==t.position);
  assert.ok(g.move(to));assert.equal(g.state.phase,'TRAVEL');g.continueTravel();assert.equal(t.hp,20);assert.equal(t.cargo[6],100);
  g.skipRemaining();assert.equal(g.actor,t);assert.ok(g.move(to));g.continueTravel();assert.equal(t.hp,20);assert.equal(t.cargo[6],80);assert.equal(T.cargoFoodRequired(t),25);
  g.skipRemaining();g.skipRemaining();assert.equal(t.hp,20);assert.equal(t.cargo[6],55);assert.equal(T.cargoFoodRequired(t),32);
 }
});

test('arrival at either port resets only the visiting ship; subsequent cargo upgrades use the new base ration',()=>{
 for(const teamId of [0,1])for(const port of [1,24]){
  const g=make(teamId);place(g);const t=g.actor,other=g.opponent;t.cargoMealRation=40;other.cargoMealRation=32;
  t.position=g.map.edges.find(e=>e.includes(port)).find(id=>id!==port);g.state.distanceLeft=30;
  assert.ok(g.move(port));assert.equal(g.state.phase,'PORT');assert.equal(t.cargoMealRation,0);assert.equal(T.cargoFoodRequired(t),20);assert.equal(T.remainingDays(t),3);assert.equal(t.hp,50);assert.equal(T.cargoFoodRequired(other),32);
  t.gold=200;assert.ok(g.upgrade('hull'));assert.ok(g.upgrade('cargo'));assert.equal(T.cargoFoodRequired(t),30);
 }
});

test('drift ice feeds both teams before storage: 50 penguins yield a meal of 20 and cargo of 30',()=>{
 for(const first of [0,1]){
  const g=make(first),island=g.state.islands.find(i=>i.category==='harvest'&&i.edible);Object.assign(island,{themeId:28,product:28,edible:true});
  assert.ok(island);assert.equal(island.edible,true);assert.equal(T.product(28).edible,true);
  for(let turn=0;turn<2;turn++){
   const t=g.actor;g.opponent.position=g.opponent.id?1:24;
   t.position=island.id;t.voyageDays=3;t.provisionCredit=0;t.cargo={};t.upgrades.hull=1;t.maxHp=100;t.hp=100;
   harvest(g);assert.equal(g.state.productReward.harvested,50);assert.equal(g.state.productReward.dailyFood,20);assert.equal(g.state.productReward.quantity,30);assert.equal(t.cargo[28],30);
   g.continueReward();assert.equal(t.hp,100);assert.equal(t.cargo[28],30,'fresh meal is not deducted from storage again');assert.equal(T.remainingDays(t),0);
  }
 }
});
