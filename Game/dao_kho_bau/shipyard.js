(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TreasureShipyard=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX_LEVEL=3,START_GOLD=100,COSTS=Object.freeze([100,500,1000]);
  const upgradeCost=level=>Number.isInteger(level)&&level>=0&&level<MAX_LEVEL?COSTS[level]:null;
  const BASES=Object.freeze([
    Object.freeze({id:1,team:1,color:'blue',name:'Dover',file:'base-blue-dover.png',harbor:'harbor-blue-dover.png'}),
    Object.freeze({id:24,team:0,color:'red',name:'Bristol',file:'base-red-bristol.png',harbor:'harbor-red-bristol.png'})
  ]);
  const UPGRADES=Object.freeze([
    Object.freeze({id:'cannon',name:'Đại bác',detail:'Trang bị thêm 1 đại bác · +5 sát thương'}),
    Object.freeze({id:'hull',name:'Thân tàu',detail:'To hơn, chứa nhiều người và đồ hơn · +50 độ bền; +25 tốc độ khai thác'}),
    Object.freeze({id:'sail',name:'Buồm',detail:'Buồm càng lớn đi càng nhanh · +10 hải lí / ngày'}),
    Object.freeze({id:'cargo',name:'Kho hàng',detail:'Kho càng lớn chứa càng nhiều đồ · +50 sức chứa kho hàng'}),
    Object.freeze({id:'provisions',name:'Kho lương',detail:'Thức ăn càng nhiều đi biển càng lâu · +3 ngày thức ăn cho hải trình'})
  ]);
  function valid(levels){return !!levels&&['hull','cannon','sail'].every(k=>Number.isInteger(levels[k])&&levels[k]>=0&&levels[k]<=MAX_LEVEL)&&levels.cannon<=levels.hull&&levels.sail<=levels.hull;}
  function filename(team,levels){
    if(![0,1].includes(team)||!valid(levels))throw Error('Tổ hợp nâng cấp tàu không hợp lệ.');
    return 'ship-'+(team?'blue':'red')+'-h'+levels.hull+'-c'+levels.cannon+'-s'+levels.sail+'.png';
  }
  const cannonCount=level=>level+1;
  const gunportCount=level=>level+1;
  const mastCount=level=>level<2?1:level;
  const speed=level=>10+10*level;
  const attack=level=>5+5*level;
  const maxDurability=level=>50+50*level;
  const durability=team=>Math.max(0,Math.min(100,Math.round(team.hp/team.maxHp*1000)/10));
  const sailDescriptions=['1 cột buồm chính nhỏ','1 cột buồm chính lớn','Buồm chính lớn + buồm sau (2 cột)','Buồm chính lớn + buồm sau + buồm trước (3 cột)'];
  const sailSteps=['Tăng kích thước buồm chính · +10 hải lí/ngày','Thêm cột buồm phía sau · +10 hải lí/ngày','Thêm cột buồm phía trước · +10 hải lí/ngày','Ba cột buồm · Tốc độ 40 hải lí/ngày'];
  const variants=[];
  for(const team of [0,1])for(let hull=0;hull<=MAX_LEVEL;hull++)for(let cannon=0;cannon<=hull;cannon++)for(let sail=0;sail<=hull;sail++){
    const levels={hull,cannon,sail};variants.push(Object.freeze({team,...levels,file:filename(team,levels)}));
  }
  return Object.freeze({MAX_LEVEL,COSTS,upgradeCost,START_GOLD,BASES,UPGRADES,cannonCount,gunportCount,mastCount,speed,attack,maxDurability,durability,sailDescriptions:Object.freeze(sailDescriptions),sailSteps:Object.freeze(sailSteps),valid,filename,variants:Object.freeze(variants)});
});
