(function(root,factory){
  'use strict';
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./island-rules.js'));else root.TreasureTrade=factory(root.TreasureIslandRules);
})(typeof globalThis!=='undefined'?globalThis:this,function(RULES){
  'use strict';
  // Theme IDs, not randomized map positions. Only harvest and combat themes have goods.
  const symbols={1:'◆',5:'◇',6:'▧',7:'♋',9:'◉',11:'◆',12:'◇',13:'≋',14:'▰',15:'◉',16:'♧',17:'●',18:'◆',19:'ϟ',20:'▧',24:'◒',27:'◇',28:'❄',29:'◈',30:'❄',31:'●',32:'✿',33:'▧',34:'♧',35:'△'};
  const descriptions={
    1:'Đá đỏ rực của đảo núi lửa, mang theo hơi nóng từ lòng đất.',
    5:'Củ sâm ẩn dưới đất rừng, nổi bật với những nhánh rễ uốn lượn.',
    6:'Trái dừa xanh mát từ những hàng cây ven biển, dùng làm thực phẩm trên tàu.',
    12:'Tinh thể trong veo lấp lánh, món sản vật nổi bật của đảo pha lê.',
    13:'Người bạn hiền lành của biển xanh, mang chiếc mai với những hoa văn đẹp mắt.',
    15:'Tôm sú tươi từ vùng nước ven đảo, nguồn thực phẩm cho những ngày lênh đênh.',
    16:'Loài nấm quý ẩn dưới đất rừng, có hương thơm đặc trưng.',
    17:'Viên ngọc lấp lánh từ vịnh tiên cá, mang vẻ đẹp huyền bí của đại dương.',
    19:'Viên đá quý của núi sấm sét, bên trong ánh lên những tia sáng xanh.',
    20:'Những hạt lúa mì vàng óng từ cánh đồng bên cối xay gió, dùng để tiếp tế.',
    24:'Sản vật đặc trưng của vùng biển cá voi, có thể mang về cảng để trao đổi.',
    27:'Sò điệp nép mình trong lớp vỏ xòe như cánh quạt, là thực phẩm của biển.',
    28:'Sản vật của vùng băng trôi, có thể dùng làm thực phẩm để tiếp tế cho tàu.',
    29:'Sản vật sống dưới đáy biển, có thể dùng làm thực phẩm trong chuyến đi.',
    31:'Trái đào chín mọng từ khu vườn trên đảo, bổ sung thực phẩm cho thủy thủ.',
    34:'Sản vật đặc trưng của đảo rắn, được cất giữ để trao đổi tại cảng.',
    35:'Sản vật quý từ vùng biển cá mập, có thể dùng để tiếp tế hoặc bán tại cảng.'
  };
  const PRODUCTS=Object.freeze(RULES.THEMES.filter(t=>['harvest','combat'].includes(t.category)).map(t=>Object.freeze({id:t.id,name:t.product,description:descriptions[t.id]||'',symbol:symbols[t.id],category:t.category,rarity:t.rarity??null,edible:t.edible??null})));
  const PRICE_RANGES=Object.freeze({common:Object.freeze({min:1,max:1}),rare:Object.freeze({min:5,max:5}),combat:Object.freeze({min:1000,max:1000})});
  const priceRange=item=>item?.category==='combat'?PRICE_RANGES.combat:item?.category==='harvest'?PRICE_RANGES[item.rarity]:null;
  const owned=(team,item)=>(item?.category==='combat'?team.loot?.[item.id]:team.cargo[item?.id])||0;
  const product=id=>PRODUCTS.find(p=>p.id===Number(id));
  const capacity=level=>100+50*level;
  const voyageCapacity=level=>3+3*level;
  const cargoCount=team=>Object.values(team.cargo).reduce((sum,n)=>sum+n,0);
  const remainingDays=team=>Math.max(0,Math.min(voyageCapacity(team.upgrades.provisions),voyageCapacity(team.upgrades.provisions)-team.voyageDays+(team.provisionCredit||0)));
  const foodRequired=level=>Math.ceil(capacity(level)*.2);
  // The next full cargo meal belongs to this ship and resets only at resupply.
  const cargoFoodRequired=team=>Math.max(foodRequired(team.upgrades.cargo),team.cargoMealRation||0);
  const harvestRate=(hullLevel=0)=>25*(hullLevel+1);
  const harvestYield=(item,hullLevel=0)=>item?.category==='harvest'?harvestRate(hullLevel):0;
  const foodCount=team=>PRODUCTS.filter(p=>p.edible===true).reduce((sum,p)=>sum+(team.cargo[p.id]||0),0);
  function foodPlan(team,quantity=cargoFoodRequired(team)){
    let needed=quantity;
    if(needed<=0)return [];
    if(foodCount(team)<needed)return null;
    const plan=[],items=PRODUCTS.filter(p=>p.edible===true).sort((a,b)=>Number(a.rarity==='rare')-Number(b.rarity==='rare')||a.id-b.id);
    for(const item of items){
      const quantity=Math.min(needed,team.cargo[item.id]||0);
      if(quantity){plan.push({id:item.id,quantity});needed-=quantity;}
      if(!needed)break;
    }
    return plan;
  }
  function daySupply(team){
    const ration=foodRequired(team.upgrades.cargo),fresh=Math.min(ration,team.dayFood||0),needed=Math.max(0,1-fresh/ration),reserveUsed=Math.min(remainingDays(team),needed);
    const cargoRation=cargoFoodRequired(team),foodNeeded=Math.max(0,Math.ceil((needed-reserveUsed)*cargoRation-1e-6));
    const cargoAllowed=team.hp*100<=team.maxHp*70;
    const cargoUsed=cargoAllowed?Math.min(foodNeeded,foodCount(team)):0;
    return {ration,cargoRation,fresh,reserveUsed,foodNeeded,cargoAllowed,cargoUsed,shortfall:foodNeeded-cargoUsed,plan:cargoUsed?foodPlan(team,cargoUsed):[]};
  }
  function quote(item,rng=Math.random){const range=priceRange(item);if(!range)return null;if(range.min===range.max)return range.min;return range.min+Math.floor(Math.min(.999999,Math.max(0,rng()))*(range.max-range.min+1));}
  const MERCHANTS=Object.freeze({
    red:Object.freeze({name:'Baltazar Râu đen',image:'merchant-red-bristol.png'}),
    blue:Object.freeze({name:'Barnaby bụng bự',image:'merchant-blue-dover.png'})
  });
  return Object.freeze({PRODUCTS,product,PRICE_RANGES,priceRange,owned,capacity,voyageCapacity,cargoCount,remainingDays,foodRequired,cargoFoodRequired,harvestRate,harvestYield,foodCount,foodPlan,daySupply,quote,MERCHANTS});
});
