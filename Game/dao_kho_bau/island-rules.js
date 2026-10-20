(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory();else root.TreasureIslandRules=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  // Theme IDs describe artwork/products; map positions are numbered separately, 1..24.
  const harvest=[
    [1,'Nham thạch',false],[5,'Nhân sâm',false],[6,'Dừa',true],
    [12,'Pha lê',false],[13,'Rùa biển',false],[15,'Tôm sú',true],
    [16,'Nấm Truffle',true],[17,'Nước mắt người cá',false],[19,'Đá sấm sét',false],
    [20,'Lúa mì',true],[24,'Mỡ cá voi',false],[27,'Sò điệp',true],
    [28,'Chim cánh cụt',true],[29,'Hải sâm',true],[31,'Hồng đào',true],
    [34,'Mật rắn',false],[35,'Vây cá mập',true]
  ];
  const combat=[
    [7,'Càng cua khổng lồ'],[9,'Kim cương đen'],[11,'Xác ướp'],[14,'Ruby đỏ'],
    [18,'Vảy rồng'],[30,'Tuyết liên'],[32,'Katana Susano'],[33,'Vật tổ']
  ];
  const rare=new Set([16,17,19,35]);
  const THEMES=Object.freeze([
    ...harvest.map(([id,product,edible])=>({id,category:'harvest',product,edible,rarity:rare.has(id)?'rare':'common'})),
    ...combat.map(([id,product])=>({id,category:'combat',product})),
    ...[2,3,4,8,10,21,22,25,26,36].map(id=>({id,category:'treasure'})),
    {id:23,category:'boss'},{id:37,category:'base',baseTeam:1},{id:38,category:'base',baseTeam:0}
  ].sort((a,b)=>a.id-b.id).map(Object.freeze));
  const theme=id=>THEMES.find(t=>t.id===Number(id));
  const label=t=>t.category==='harvest'?'Khai thác '+(t.rarity==='rare'?'quý':'thường'):
    ({combat:'Chiến đấu',treasure:'Kho báu',boss:'Boss Kraken',base:'Căn cứ'})[t.category];
  function shuffle(items,rng){
    const out=[...items];
    for(let i=out.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  }
  function bossPosition(map){
    const center=map.islands.find(i=>i.central&&i.id>=9&&i.id<=16);
    if(!center||![12,13].includes(center.id))throw Error('Tâm vùng 2 phải nằm tại ô 12 hoặc 13.');
    return center.id;
  }
  function selectThemes(rng=Math.random,krakenPosition=12+Math.min(1,Math.floor(rng()*2)),edges){
    if(![12,13].includes(krakenPosition))throw Error('Kraken phải ở ô 12 hoặc 13.');
    const pool=THEMES.filter(t=>t.category==='harvest'&&t.rarity==='common');
    const food=shuffle(pool.filter(t=>t.edible),rng).slice(0,2);
    const extra=shuffle(pool.filter(t=>!food.includes(t)),rng).slice(0,4);
    const common=[food[0],...extra.slice(0,2),food[1],...extra.slice(2)];
    const precious=shuffle(THEMES.filter(t=>t.rarity==='rare'),rng);
    const fighters=shuffle(THEMES.filter(t=>t.category==='combat'),rng);
    const chests=shuffle(THEMES.filter(t=>t.category==='treasure'),rng).slice(0,3);
    const first=shuffle([...common.slice(0,3),...fighters.slice(0,2),chests[0]],rng);
    const last=shuffle([...common.slice(3),...fighters.slice(6),chests[2]],rng);
    const middle=shuffle([...precious.slice(2),...fighters.slice(2,6),chests[1]],rng);
    middle.splice(krakenPosition-9,0,theme(23));
    const slots=[theme(37),...first,precious[0],...middle,precious[1],...last,theme(38)];
    for(const [base,start,end,near] of [[1,2,7,[2,3]],[24,18,23,[22,23]]]){
      const neighbors=near.filter(id=>!edges||edges.some(e=>e.includes(base)&&e.includes(id)));
      if(neighbors.some(id=>slots[id-1].rarity==='common'&&slots[id-1].edible))continue;
      if(!neighbors.length)throw Error('Căn cứ '+base+' cần đường nối tới một trong hai đảo cạnh cảng.');
      const target=neighbors[Math.min(neighbors.length-1,Math.floor(rng()*neighbors.length))]-1;
      const donors=slots.map((t,i)=>({t,i})).filter(({t,i})=>i>=start-1&&i<end&&t.rarity==='common'&&t.edible);
      const donor=donors[Math.min(donors.length-1,Math.floor(rng()*donors.length))].i;
      [slots[target],slots[donor]]=[slots[donor],slots[target]];
    }
    return slots;
  }
  function validateMap(map){
    const slots=[...map.islands].sort((a,b)=>a.id-b.id);
    const types=slots.map(i=>theme(i.art?.id??i.themeId));
    if(slots.length!==24||slots.some((s,i)=>s.id!==i+1)||types.some(t=>!t)||new Set(types.map(t=>t.id)).size!==24)
      throw Error('Bản đồ cần 24 vị trí và 24 chủ đề không trùng nhau.');
    if(types[0].id!==37||types[23].id!==38)throw Error('Dover phải ở ô 1, Bristol phải ở ô 24.');
    if(slots.some((s,i)=>s.kind!==(types[i].category==='boss'?'kraken':'island')))
      throw Error('Kraken là vùng đặc biệt duy nhất; Cá Voi thuộc nhóm khai thác.');
    for(let region=0;region<3;region++){
      const group=types.slice(region*8,region*8+8),count=(category,rarity)=>group.filter(t=>t.category===category&&(!rarity||t.rarity===rarity)).length;
      const outer=region!==1;
      if(count('base')!==(outer?1:0)||count('boss')!==(outer?0:1)||count('combat')!==(outer?2:4)||count('treasure')!==1||count('harvest','common')!==(outer?3:0)||count('harvest','rare')!==(outer?1:2))
        throw Error('Sai phân bố đảo tại vùng '+(region+1)+'.');
    }
    for(const [outer,inner] of [[8,9],[17,16]]){
      if(types[outer-1].rarity!=='rare'||!map.edges.some(e=>e.includes(outer)&&e.includes(inner)))
        throw Error('Đảo khai thác quý ở ô '+outer+' phải nối trực tiếp sang vùng 2.');
    }
    for(const base of [1,24])if(!map.edges.some(e=>e.includes(base)&&types[e.find(id=>id!==base)-1]?.rarity==='common'))
      throw Error('Căn cứ '+base+' phải nối trực tiếp ít nhất một đảo khai thác thường.');
    for(const [base,near] of [[1,[2,3]],[24,[22,23]]])if(!near.some(id=>types[id-1].category==='harvest'&&types[id-1].edible&&map.edges.some(e=>e.includes(base)&&e.includes(id))))
      throw Error('Căn cứ '+base+' phải nối tới đảo thực phẩm tại ô '+near.join(' hoặc ')+'.');
    const boss=slots.find((s,i)=>types[i].category==='boss');
    if(![12,13].includes(boss.id)||boss.id!==bossPosition(map))throw Error('Kraken phải ở chính giữa vùng 2, ô 12 hoặc 13.');
    return true;
  }
  return Object.freeze({THEMES,theme,label,bossPosition,selectThemes,validateMap});
});
