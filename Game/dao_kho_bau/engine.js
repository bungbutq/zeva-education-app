(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./map-layout.js'),require('./shipyard.js'),require('./trade.js'),require('./island-rules.js'));
  else root.TreasureEngine = factory(root.TreasureMapLayout,root.TreasureShipyard,root.TreasureTrade,root.TreasureIslandRules);
})(typeof globalThis !== 'undefined' ? globalThis : this, function (layout,YARD,TRADE,RULES) {
  'use strict';
  const LEG_DISTANCE=30,TREASURE_DAYS=3,TREASURE_CLUES=2,TREASURE_GOLD=3000,TURN_LIMIT=60,ISLAND_DURABILITY=500,ISLAND_ATTACK=10,KRAKEN_DURABILITY=1000,KRAKEN_ATTACK=30;
  const DEFAULT_MAP=layout.create(()=>.5);
  const DEFAULT_THEMES=RULES.selectThemes(()=>.5,RULES.bossPosition(DEFAULT_MAP),DEFAULT_MAP.edges);
  const ISLANDS=Object.freeze(DEFAULT_MAP.islands.map((i,index)=>Object.freeze({...i,themeId:DEFAULT_THEMES[index].id,kind:DEFAULT_THEMES[index].category==='boss'?'kraken':'island'})));
  const EDGES=Object.freeze(DEFAULT_MAP.edges.map(Object.freeze));
  const adjacent=(from,to,edges=EDGES)=>edges.some(([a,b])=>a===from&&b===to||a===to&&b===from);
  const shuffled=(items,rng)=>{const out=[...items];for(let i=out.length-1;i>0;i--){const j=Math.min(i,Math.floor(rng()*(i+1)));[out[i],out[j]]=[out[j],out[i]];}return out;};
  function validateQuestions(input) {
    if (!Array.isArray(input) || input.length < 11 || input.length > 500)
      throw new Error('Bộ câu hỏi cần từ 11 đến 500 câu.');
    return input.map((q, i) => {
      if (!q || typeof q.text !== 'string' || !q.text.trim() || q.text.length > 700 ||
        !Array.isArray(q.options) || q.options.length !== 4 ||
        q.options.some(v => typeof v !== 'string' || !v.trim() || v.length > 220) ||
        !Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3 ||
        (q.explanation !== undefined && (typeof q.explanation !== 'string' || q.explanation.length > 1000)))
        throw new Error('Câu ' + (i + 1) + ' không hợp lệ: cần text, 4 options và answer từ 0 đến 3.');
      return { text:q.text.trim(), options:q.options.map(s => s.trim()), answer:q.answer,
        explanation:q.explanation || '' };
    });
  }
  class Game {
    constructor({questions,names=['Đội Đỏ','Đội Xanh'],first=0,rng=Math.random,map={...DEFAULT_MAP,islands:ISLANDS}}={}) {
      this.questions=validateQuestions(questions);this.rng=rng;this.map=map;this.bag=[];
      RULES.validateMap(map);
      const startingTeam=first===1?1:0;
      this.state={phase:'PORT',active:startingTeam,startingTeam,turn:1,distanceLeft:10,dayStarted:false,dayReport:null,portInitial:true,launchQueue:[1-startingTeam],
        teams:[0,1].map(id=>({id,name:String(names[id]||(id?'Đội Xanh':'Đội Đỏ')).slice(0,22),hp:YARD.maxDurability(0),maxHp:YARD.maxDurability(0),attack:YARD.attack(0),armor:0,shield:false,speed:YARD.speed(0),periscope:false,scouted:[],position:YARD.BASES.find(b=>b.team===id).id,transit:null,gold:YARD.START_GOLD,upgrades:{hull:0,cannon:0,sail:0,cargo:0,provisions:0},cargo:{},loot:{},dayFood:0,cargoMealRation:0,provisionCredit:0,voyageDays:0,totalDays:0,chests:0,turns:0,monsterAttacksSinceRepair:0})),
        islands:map.islands.map(i=>{const base=YARD.BASES.find(b=>b.id===i.id),theme=RULES.theme(i.art?.id??i.themeId),product=!base&&i.kind!=='kraken'?TRADE.product(theme.id):null;return {id:i.id,kind:i.kind,themeId:theme.id,category:theme.category,rarity:theme.rarity??null,edible:theme.edible??null,explored:!!base,opened:false,start:!!base,baseTeam:base?.team??null,owner:base?.team??null,attempts:0,effectId:theme.category==='treasure'?'search':null,product:product?.id??null,productCollectedBy:null,defender:theme.category==='combat'?{hp:ISLAND_DURABILITY,maxHp:ISLAND_DURABILITY,attack:ISLAND_ATTACK}:null};}),
        markets:{},kraken:{hp:KRAKEN_DURABILITY,maxHp:KRAKEN_DURABILITY,attack:KRAKEN_ATTACK,damageBy:[0,0]},treasure:{location:null,owner:null,claimedBy:null,clues:[[],[]],progress:[{},{}],lastSearchTurn:[null,null]},
        question:null,selected:null,correct:null,goldDelta:0,productReward:null,purpose:null,reward:null,battle:null,winner:null,reason:null,log:[],history:[],notice:'Nâng cấp tàu tại căn cứ trước khi ra khơi.'};
    }
    get actor(){return this.state.teams[this.state.active];}
    get opponent(){return this.state.teams[1-this.state.active];}
    get island(){return this.state.islands.find(i=>i.id===this.actor.position);}
    note(message){this.state.log.push({turn:this.state.turn,message});}
    get base(){return !this.actor.transit&&YARD.BASES.find(b=>b.id===this.actor.position);}
    get enemyHere(){return !this.actor.transit&&!this.opponent.transit&&this.opponent.position===this.actor.position;}
    refreshMarket(baseId){
      if(!YARD.BASES.some(b=>b.id===baseId))return null;
      const prices={};
      for(const island of this.state.islands){const item=TRADE.product(island.product);if(item)prices[item.id]=TRADE.quote(item,this.rng);}
      this.state.markets[baseId]=prices;return prices;
    }
    viewMarketPrices(baseId){
      if(!YARD.BASES.some(b=>b.id===baseId))return null;
      return this.state.markets[baseId]||this.refreshMarket(baseId);
    }
    marketPrices(){
      if(this.state.phase!=='PORT'||!this.base)return null;
      return this.viewMarketPrices(this.base.id);
    }
    sellProduct(id,quantity=1){
      const item=TRADE.product(id),prices=this.marketPrices(),t=this.actor;
      if(!item||!prices||!Number.isInteger(quantity)||quantity<=0||TRADE.owned(t,item)<quantity||!Number.isFinite(prices[item.id]))return false;
      const stock=item.category==='combat'?t.loot:t.cargo,gold=prices[item.id]*quantity;stock[item.id]-=quantity;if(!stock[item.id])delete stock[item.id];t.gold+=gold;
      this.state.notice='Đã bán '+quantity+' '+item.name+' · +'+gold+' vàng';this.note(t.name+': '+this.state.notice);return true;
    }
    collectProduct(){
      const s=this.state,i=this.island,t=this.actor,item=TRADE.product(i.product);
      if(!['MAP','ENCOUNTER','CHEST'].includes(s.phase)||s.purpose!=='island'||t.transit||!item)return;
      const harvest=i.category==='harvest';
      if(i.category==='combat'&&i.defender.hp>0)return;
      if(harvest?t.harvestedTurn===s.turn:i.productCollectedBy!==null)return;
      const free=Math.max(0,TRADE.capacity(t.upgrades.cargo)-TRADE.cargoCount(t));
      if(harvest&&!item.edible&&free<=0){s.productReward={id:item.id,quantity:0,full:true};return;}
      if(harvest)this.spendDay();
      const harvested=harvest?TRADE.harvestYield(item,t.upgrades.hull):1,ration=TRADE.foodRequired(t.upgrades.cargo);
      const dailyFood=harvest&&item.edible?Math.min(harvested,Math.max(0,ration-t.dayFood)):0;
      t.dayFood+=dailyFood;
      const quantity=harvest?Math.min(free,harvested-dailyFood):1,stock=harvest?t.cargo:t.loot;
      if(quantity)stock[item.id]=(stock[item.id]||0)+quantity;
      const overflow=harvested-dailyFood-quantity,room=(TRADE.voyageCapacity(t.upgrades.provisions)-TRADE.remainingDays(t))*ration;
      const reserveFood=harvest&&item.edible?Math.min(overflow,Math.max(0,Math.floor(room+1e-6))):0;
      if(reserveFood)this.setReserveDays(TRADE.remainingDays(t)+reserveFood/ration);
      if(harvest)t.harvestedTurn=s.turn;else i.productCollectedBy=t.id;
      s.productReward={id:item.id,quantity,harvested,dailyFood,reserveFood,reserveDays:reserveFood/ration,discarded:overflow-reserveFood,full:false};
      this.note(t.name+' nhận '+harvested+' '+item.name+': '+quantity+' vào kho'+(dailyFood?', '+dailyFood+' cho khẩu phần hôm nay':'')+(reserveFood?', '+reserveFood+' vào dự trữ':'')+'.');
    }
    // Track days since port independently from meals, replenishment and exhausted days.
    setReserveDays(days){
      const t=this.actor,capacity=TRADE.voyageCapacity(t.upgrades.provisions),remaining=Math.max(0,Math.min(capacity,days));
      t.provisionCredit=Math.round(Math.max(0,t.voyageDays-capacity+remaining)*1e8)/1e8;
    }

    upgradeStatus(kind){
      const t=this.actor,level=t.upgrades[kind];
      if(!YARD.UPGRADES.some(u=>u.id===kind)||this.state.phase!=='PORT'||!this.base)return {ok:false,reason:'Chỉ nâng cấp khi đang ở bến cảng.'};
      if(level>=YARD.MAX_LEVEL)return {ok:false,reason:'Đã đạt cấp tối đa.'};
      if(kind!=='hull'&&level+1>t.upgrades.hull)return {ok:false,reason:'Cần Thân tàu Lv'+(level+1)};
      const cost=YARD.upgradeCost(level);
      if(t.gold<cost)return {ok:false,reason:'Thiếu '+(cost-t.gold)+' vàng',cost};
      return {ok:true,reason:'Nâng cấp',cost};
    }
    upgrade(kind){
      const status=this.upgradeStatus(kind);if(!status.ok)return false;
      const t=this.actor;t.gold-=status.cost;t.upgrades[kind]++;
      if(kind==='cannon')t.attack=YARD.attack(t.upgrades.cannon);
      if(kind==='hull'){const maximum=YARD.maxDurability(t.upgrades.hull);t.hp+=maximum-t.maxHp;t.maxHp=maximum;}
      if(kind==='sail')t.speed=YARD.speed(t.upgrades.sail);
      this.state.notice=YARD.UPGRADES.find(u=>u.id===kind).name+' lên Lv'+t.upgrades[kind]+' · −'+status.cost+' vàng';
      this.note(t.name+': '+this.state.notice);return true;
    }
    leavePort(){
      const s=this.state;if(s.phase!=='PORT')return false;
      if(s.portInitial){
        if(s.launchQueue.length){s.active=s.launchQueue.shift();s.notice='Nâng cấp tàu tại căn cứ trước khi ra khơi.';}
        else{s.portInitial=false;s.active=s.startingTeam;s.distanceLeft=this.actor.speed;s.dayStarted=false;s.phase='MAP';s.notice='Chọn đảo để bắt đầu hải trình.';}
      }else if(this.enemyHere)s.phase='ENCOUNTER';
      else this.finishAction();
      return true;
    }
    chestIntel(){return null;}
    treasureIntel(id,team=this.actor.id){
      const h=this.state.treasure;
      return h.owner===team&&h.location===id?(h.claimedBy===null?'marked':'claimed'):null;
    }
    canDig(){
      return !this.actor.transit&&this.treasureIntel(this.actor.position)==='marked'&&this.actor.arrivedTurn!==this.state.turn;
    }
    canMove(id){
      if(this.state.phase!=='MAP'||this.state.distanceLeft<=0||!Number.isInteger(id)||!this.state.islands.some(i=>i.id===id))return false;
      if(this.actor.transit)return id===this.actor.transit.to||id===this.actor.transit.from;
      return adjacent(this.actor.position,id,this.map.edges)||(id===this.actor.position&&(this.base||this.enemyHere||this.canExplore()));
    }
    canExplore(){
      const i=this.island,t=this.actor;if(t.transit||!i||i.start)return false;
      if(this.treasureIntel(i.id)==='marked')return true;
      const free=TRADE.cargoCount(t)<TRADE.capacity(t.upgrades.cargo);
      if(i.category==='harvest')return (free||i.edible===true)&&t.harvestedTurn!==this.state.turn;
      if(i.kind==='kraken')return this.state.kraken.hp>0;
      if(i.category==='treasure'){const h=this.state.treasure;return h.location===null&&!h.clues[t.id].includes(i.id)&&h.lastSearchTurn[t.id]!==this.state.turn;}
      return i.product&&i.productCollectedBy===null;
    }
    spendDay(){
      const s=this.state,t=this.actor;if(s.dayStarted)return true;
      s.dayStarted=true;s.dayReport=null;t.dayFood=0;t.totalDays++;
      return true;
    }
    settleDay(){
      const s=this.state,t=this.actor;this.spendDay();t.travelPermit=null;
      if(this.base){t.voyageDays=0;t.provisionCredit=0;t.dayFood=0;t.cargoMealRation=0;return;}
      const supply=TRADE.daySupply(t),remaining=TRADE.remainingDays(t)-supply.reserveUsed;
      t.voyageDays++;this.setReserveDays(remaining);t.dayFood=0;
      if(supply.foodNeeded===0){
        if(supply.fresh){s.dayReport=t.name+' đã dùng '+supply.fresh+' thực phẩm mới khai thác cho khẩu phần hôm nay.';this.note(s.dayReport);}
        return;
      }
      if(supply.plan){
        for(const {id,quantity} of supply.plan){t.cargo[id]-=quantity;if(!t.cargo[id])delete t.cargo[id];}
        t.cargoMealRation=Math.ceil(supply.cargoRation*1.25);
        s.dayReport=t.name+' dùng thêm '+supply.foodNeeded+' đơn vị thực phẩm trong kho, giữ nguyên độ bền. Khẩu phần kho hàng lần tiếp theo: '+t.cargoMealRation+' đơn vị/ngày.';
        this.note(s.dayReport+' '+supply.plan.map(p=>p.quantity+' '+TRADE.product(p.id).name).join(', ')+'.');
      }else{
        const damage=t.maxHp*.1;t.hp=Math.max(0,t.hp-damage);
        s.dayReport=t.name+(supply.cargoAllowed?' không đủ thực phẩm thay thế':' đã hết lương thực; chỉ tự dùng hàng ăn được khi độ bền còn 70% trở xuống')+': −10% độ bền tối đa (−'+damage+' điểm).';this.note(s.dayReport);
      }
    }
    move(id){
      if(!this.canMove(id))return false;
      const s=this.state,t=this.actor;let from=t.transit?.from??t.position;
      this.spendDay();
      s.reward=null;s.battle=null;s.productReward=null;
      const destination=s.islands.find(i=>i.id===id);
      if(!t.transit&&!destination.explored&&t.travelPermit!==id){
        this.askDestination(id);return {from,to:id,start:0,end:0,arrived:false,question:true};
      }
      s.question=null;s.questionIsland=null;s.pendingDestination=null;
      if(t.transit&&id===t.transit.from){
        const trip=t.transit;t.transit={from:trip.to,to:trip.from,travelled:LEG_DISTANCE-trip.travelled,returning:!trip.returning};from=t.transit.from;
        this.note(t.name+' quay lại đảo '+id+', còn '+trip.travelled+' hải lí.');
      }
      const result={from,to:id,start:0,end:1,arrived:true};
      if(t.transit||from!==id){
        if(!t.transit){if(YARD.BASES.some(b=>b.id===from&&b.team===t.id))this.refreshMarket(from);t.transit={from,to:id,travelled:0};t.travelPermit=null;}
        const trip=t.transit,step=Math.min(s.distanceLeft,LEG_DISTANCE-trip.travelled);
        result.start=trip.travelled/LEG_DISTANCE;trip.travelled+=step;s.distanceLeft-=step;result.end=trip.travelled/LEG_DISTANCE;
        if(trip.travelled<LEG_DISTANCE){
          s.phase='TRAVEL';s.notice='Đang đi tới đảo '+id+' · '+trip.travelled+'/'+LEG_DISTANCE+' hải lí';result.arrived=false;return result;
        }
        t.position=id;t.transit=null;t.arrivedTurn=s.turn;
      }else s.distanceLeft=0;
      t.travelPermit=null;destination.explored=true;destination.owner??=t.id;
      this.note(this.actor.name+' cập bến điểm '+id+'.');
      if(this.base){this.actor.voyageDays=0;this.actor.provisionCredit=0;this.actor.dayFood=0;this.actor.cargoMealRation=0;this.actor.hp=this.actor.maxHp;this.actor.monsterAttacksSinceRepair=0;this.state.phase='PORT';this.state.notice='Đã sửa tàu, tiếp tế đầy và đặt lại lần tấn công quái vật tại '+this.base.name+'.';}
      else if(this.enemyHere||this.island.kind==='kraken'&&s.kraken.hp>0)this.state.phase='ENCOUNTER';
      else this.arrive();
      return result;
    }
    arrive(){
      if(this.treasureIntel(this.actor.position)==='marked'){
        if(this.canDig())this.digTreasure();
        else{const s=this.state;s.distanceLeft=0;s.reward={type:'treasure-arrival',effect:{name:'Đã tới nơi chôn kho báu',icon:'⌖',detail:'Ngày cập bến đã kết thúc. Ngày sau chọn lại đảo này để dành 1 ngày đào rương.'}};s.phase='REWARD';}
      }
      else if(!this.canExplore()){this.state.notice='Điểm '+this.island.id+' không còn hành động khám phá lúc này.';this.finishAction();}
      else if(this.island.kind!=='island')this.state.phase='ENCOUNTER';
      else{
        const s=this.state,i=this.island;s.purpose='island';
        if(i.category==='combat'&&i.defender.hp>0){s.phase='ISLAND_BATTLE';s.reward=null;s.productReward=null;return;}
        if(i.category==='harvest')s.distanceLeft=0;
        if(i.category==='treasure'){this.searchTreasure();return;}
        this.collectProduct();const reward=s.productReward,item=TRADE.product(i.product);
        s.reward={type:'product',effect:{name:i.category==='harvest'?'Đã khai thác sản vật':'Nhận chiến lợi phẩm độc nhất',icon:'✦',detail:reward&&!reward.full?'Nhận '+reward.quantity+' '+item.name+(i.category==='combat'?'. Không chiếm kho hàng. Bán cho thương nhân được 1.000 vàng; đảo này không có chiến lợi phẩm lần nữa.':'. Mang về cảng hoặc dùng thực phẩm để tiếp tế.'):'Kho hàng đầy. Có thể quay lại khi còn chỗ.'}};
        if(i.category==='harvest'&&item.edible&&reward&&!reward.full){
          const parts=['Khai thác '+reward.harvested+' '+item.name+'.'];
          if(reward.dailyFood)parts.push('Bù khẩu phần hôm nay: '+reward.dailyFood+'/'+TRADE.foodRequired(this.actor.upgrades.cargo)+' đơn vị.');
          parts.push('Cất vào kho: '+reward.quantity+' đơn vị.');
          if(reward.reserveFood)parts.push('Bổ sung dự trữ: '+reward.reserveFood+' đơn vị (+'+String(Math.round(reward.reserveDays*100)/100).replace('.',',')+' ngày).');
          if(reward.discarded)parts.push('Kho và dự trữ đã đầy; bỏ lại '+reward.discarded+' đơn vị.');
          s.reward.effect.detail=parts.join(' ');
        }
        s.phase='REWARD';
      }
    }
    encounter(action){
      if(this.state.phase!=='ENCOUNTER')return false;
      if(action==='leave'){this.finishAction();return true;}
      if(action==='duel'&&this.enemyHere){this.state.purpose='duel';this.fight();return true;}
      if(action==='explore'&&this.canExplore()){
        if(this.island.kind==='kraken'){this.state.purpose='kraken';this.fightKraken();}else this.arrive();return true;
      }
      return false;
    }
    drawQuestion(){if(!this.bag.length)this.bag=shuffled(this.questions,this.rng);return this.bag.pop();}
    askDestination(id){
      const s=this.state;s.purpose='passage';s.pendingDestination=id;s.questionIsland=id;s.question=this.drawQuestion();s.selected=null;s.correct=null;s.productReward=null;s.phase='QUESTION';s.islands.find(i=>i.id===id).attempts++;
    }
    answer(index){
      const s=this.state;if(s.phase!=='QUESTION'||!Number.isInteger(index)||index<0||index>3)return false;
      s.selected=index;s.correct=index===s.question.answer;
      const before=this.actor.gold;this.actor.gold=s.correct?before:Math.floor(before/2);s.goldDelta=this.actor.gold-before;
      s.history.push({team:this.actor.name,island:s.questionIsland,purpose:s.purpose,question:s.question,selected:index,correct:s.correct,goldDelta:s.goldDelta});
      s.phase='ANSWER';this.note(this.actor.name+(s.correct?' trả lời đúng, mở khóa di chuyển tới đảo '+s.pendingDestination+'.':' trả lời sai, mất '+(-s.goldDelta)+' vàng; không được di chuyển trong ngày này.'));return true;
    }
    continueAnswer(){
      const s=this.state;if(s.phase!=='ANSWER')return false;
      const id=s.pendingDestination;s.pendingDestination=null;
      if(!s.correct){this.actor.travelPermit=null;s.distanceLeft=0;s.notice='Chưa đúng. Tàu giữ nguyên vị trí; có thể thử lại ngày sau.';this.finishAction();}
      else{this.actor.travelPermit=id;s.phase='MAP';s.notice='Được phép di chuyển tới đảo '+id+'.';}
      return true;
    }
    incoming(team,amount){return team.shield?0:Math.max(0,amount-team.armor);}
    searchTreasure(){
      const s=this.state,t=this.actor,i=this.island,hunt=s.treasure;
      if(!['MAP','ENCOUNTER'].includes(s.phase)||t.transit||i.category!=='treasure'||hunt.location!==null||!this.canExplore())return false;
      this.spendDay();s.distanceLeft=0;hunt.lastSearchTurn[t.id]=s.turn;
      const days=Math.min(TREASURE_DAYS,(hunt.progress[t.id][i.id]||0)+1);hunt.progress[t.id][i.id]=days;
      if(days<TREASURE_DAYS){
        s.reward={type:'search',effect:{name:'Đang tìm kiếm manh mối',icon:'⌕',detail:'Đảo '+i.id+': '+days+'/'+TREASURE_DAYS+' ngày. Cần tìm thêm '+(TREASURE_DAYS-days)+' ngày.'}};
        s.phase='REWARD';this.note(t.name+' tìm kiếm đảo '+i.id+': '+days+'/'+TREASURE_DAYS+' ngày.');return true;
      }
      hunt.clues[t.id].push(i.id);
      let detail='Đã có '+hunt.clues[t.id].length+'/'+TREASURE_CLUES+' manh mối. Đến một đảo kho báu khác để tìm manh mối còn lại.';
      if(hunt.clues[t.id].length===TREASURE_CLUES){
        const region=t.id===1?0:2,candidates=s.islands.filter(n=>!n.start&&Math.floor((n.id-1)/8)===region);
        hunt.location=candidates[Math.min(candidates.length-1,Math.floor(this.rng()*candidates.length))].id;hunt.owner=t.id;
        detail='Đủ 2 manh mối! Rương xuất hiện ở đảo '+hunt.location+' trong vùng căn cứ của bạn. Chỉ đội bạn thấy vị trí này. Tới đó rồi dành 1 ngày riêng để đào, nhận 3.000 vàng.';
      }
      s.reward={type:'clue',effect:{name:'Tìm thấy manh mối',icon:'⌖',detail}};s.phase='REWARD';this.note(t.name+' đã tìm được một manh mối.');
      return true;
    }
    digTreasure(){
      const s=this.state;
      if(!['MAP','ENCOUNTER'].includes(s.phase)||!this.canDig())return false;
      this.spendDay();s.distanceLeft=0;s.productReward=null;s.purpose='dig';s.phase='CHEST';s.notice='Đã dành 1 ngày đào rương kho báu.';return true;
    }
    hurt(team,amount,minimumHp=0){
      const blocked=team.shield;if(blocked)team.shield=false;
      const damage=blocked?0:Math.min(Math.max(0,team.hp-minimumHp),Math.max(0,amount-team.armor));team.hp-=damage;
      return {damage,blocked};
    }
    monsterSafety(defender,maxCounters=Infinity){
      const a=this.actor;
      const counters=Math.min(maxCounters,Math.max(0,Math.ceil(defender.hp/a.attack)-1));
      const damage=Math.max(0,counters-(a.shield?1:0))*Math.max(0,defender.attack-a.armor);
      const protectedAttack=(a.monsterAttacksSinceRepair||0)===0&&damage>=a.hp;
      return {protectedAttack,minimumHp:protectedAttack?Math.min(a.hp,a.maxHp*.3):0};
    }
    retreatFromMonster(battle){
      const s=this.state,a=this.actor;
      battle.retreated=true;s.productReward=null;
      const percent=Math.round(a.hp/a.maxHp*1000)/10;
      const remaining=battle.type==='island'?this.island.defender:s.kraken;
      const detail='Tàu dừng giao tranh ở '+percent+'% độ bền ('+a.hp+'/'+a.maxHp+'). Có thể quay về cảng sửa tàu để đặt lại lần tấn công. Nếu đánh tiếp trước khi sửa, tàu có thể chìm. Mục tiêu còn '+remaining.hp+'/'+remaining.maxHp+' độ bền; phần đã mất được giữ lại.';
      s.reward={type:'retreat',effect:{name:'Tạm ngừng giao tranh',icon:'⚑',detail}};s.phase='REWARD';this.note(a.name+': '+detail);
    }
    openChest(){
      const hunt=this.state.treasure;
      if(this.state.phase!=='CHEST'||this.state.purpose!=='dig'||!this.canDig())return false;
      const effect={name:'Đã đào được kho báu!',icon:'✦',detail:'Nhận 3.000 vàng. Rương duy nhất trên bản đồ đã được mở.'};
      const t=this.actor,before={hp:t.hp,attack:t.attack,armor:t.armor,maxHp:t.maxHp};
      t.gold+=TREASURE_GOLD;hunt.claimedBy=t.id;t.chests++;
      const blocked=false;
      this.state.reward={type:'chest',effect,blocked,before,after:{hp:t.hp,attack:t.attack,armor:t.armor,maxHp:t.maxHp}};
      this.note(t.name+' mở rương: '+effect.name+(blocked?' (khiên đã chặn).':'.'));
      if(!this.checkWinner())this.state.phase='REWARD';return this.state.reward;
    }
    fight(){
      if(this.state.phase!=='ENCOUNTER'||!this.enemyHere)return false;
      const a=this.actor,b=this.opponent,hit=this.hurt(b,a.attack);
      this.state.battle={type:'duel',attacker:a.id,defender:b.id,damageA:0,damageB:hit.damage,shields:[false,hit.blocked]};
      this.note(a.name+' bắn '+b.name+' mất '+hit.damage+' máu.');
      // Resolve the first fatal impact immediately. A destroyed ship never fires back.
      if(this.checkWinner())return;
      const counter=this.hurt(a,b.attack);this.state.battle.damageA=counter.damage;this.state.battle.shields[0]=counter.blocked;
      this.note(b.name+' phản công: '+a.name+' mất '+counter.damage+' máu.');
      if(!this.checkWinner())this.state.phase='BATTLE';
    }
    fightKraken(){
      if(this.state.phase!=='ENCOUNTER'||this.island.kind!=='kraken'||this.state.kraken.hp<=0)return false;
      const a=this.actor,k=this.state.kraken,safety=this.monsterSafety(k,1),damage=Math.min(k.hp,a.attack);a.monsterAttacksSinceRepair=(a.monsterAttacksSinceRepair||0)+1;k.hp-=damage;
      k.damageBy[a.id]+=damage;
      this.state.battle={type:'kraken',attacker:a.id,damageB:damage,damageA:0,shields:[false,false]};
      this.note(a.name+' gây '+damage+' sát thương lên Kraken, còn '+k.hp+' máu.');
      if(k.hp===0){this.island.explored=true;this.checkWinner();return;}
      const counter=this.hurt(a,k.attack,safety.minimumHp);this.state.battle.damageA=counter.damage;this.state.battle.shields[0]=counter.blocked;
      this.note('Kraken phản đòn: '+a.name+' mất '+counter.damage+' máu.');
      if(safety.protectedAttack&&a.hp<=safety.minimumHp){this.retreatFromMonster(this.state.battle);return;}
      if(!this.checkWinner())this.state.phase='BATTLE';
    }
    fightIsland(){
      const s=this.state,i=this.island,a=this.actor;
      if(s.phase!=='ISLAND_BATTLE'||i.category!=='combat'||i.defender.hp<=0||i.productCollectedBy!==null||a.hp<=0||!Number.isFinite(a.attack)||a.attack<=0)return false;
      const defender=i.defender,safety=this.monsterSafety(defender),battle={type:'island',attacker:a.id,islandId:i.id,damageA:0,damageB:0,rounds:[]};
      a.monsterAttacksSinceRepair=(a.monsterAttacksSinceRepair||0)+1;
      s.battle=battle;
      // The arriving ship fires first, as in other encounters. Fatal hits stop retaliation.
      while(a.hp>0&&defender.hp>0){
        const damage=Math.min(defender.hp,a.attack);defender.hp-=damage;
        const counter=defender.hp>0?this.hurt(a,defender.attack,safety.minimumHp):{damage:0,blocked:false};
        battle.damageB+=damage;battle.damageA+=counter.damage;
        battle.rounds.push({damageB:damage,damageA:counter.damage,blocked:counter.blocked,shipHp:a.hp,islandHp:defender.hp});
        if(safety.protectedAttack&&defender.hp>0&&a.hp<=safety.minimumHp){this.retreatFromMonster(battle);return battle;}
      }
      this.note(a.name+' giao chiến tại điểm '+i.id+': tàu còn '+a.hp+'/'+a.maxHp+' độ bền, đảo còn '+defender.hp+'/'+defender.maxHp+'.');
      if(this.checkWinner())return battle;
      s.phase='ENCOUNTER';this.arrive();
      s.reward.effect.name='Chiến thắng trên đảo';
      s.reward.effect.detail='Hạ đảo sau '+battle.rounds.length+' lượt bắn. Tàu còn '+a.hp+'/'+a.maxHp+' độ bền. '+s.reward.effect.detail;
      return battle;
    }
    continueBattle(){if(this.state.phase!=='BATTLE')return false;this.finishAction();return true;}
    continueReward(){if(this.state.phase!=='REWARD')return false;this.finishAction();return true;}
    continueTravel(){if(this.state.phase!=='TRAVEL')return false;this.finishAction();return true;}
    skipRemaining(){if(this.state.phase!=='MAP')return false;this.spendDay();this.state.distanceLeft=0;this.finishAction();return true;}
    finishAction(){
      if(this.checkWinner())return;
      const s=this.state;if(s.distanceLeft>0){s.phase='MAP';return;}
      this.settleDay();this.actor.turns++;if(this.checkWinner())return;
      s.active=1-s.active;s.turn++;s.distanceLeft=this.actor.speed;s.dayStarted=false;s.phase='MAP';
    }
    win(id,reason){this.state.winner=id;this.state.reason=reason;this.state.phase='RESULT';this.note((id===null?'Hai đội hòa nhau.':this.state.teams[id].name+' chiến thắng.')+' '+reason);}
    compareGold(reason){
      const [red,blue]=this.state.teams,delta=red.gold-blue.gold;
      this.win(delta===0?null:delta>0?0:1,reason+' Vàng đang giữ: '+red.name+' '+red.gold+' · '+blue.name+' '+blue.gold+'.'+(delta===0?' Hai đội hòa nhau.':''));
    }
    checkWinner(){
      const s=this.state;if(s.phase==='RESULT')return true;
      const dead=s.teams.find(t=>t.hp<=0);if(dead){this.win(1-dead.id,dead.name+' đã hết độ bền.');return true;}
      if(s.kraken.hp<=0){
        const [red,blue]=s.kraken.damageBy,reason='Kraken bị tiêu diệt. Sát thương: '+s.teams[0].name+' '+red+' · '+s.teams[1].name+' '+blue+'.';
        if(red===blue)this.compareGold(reason+' Sát thương bằng nhau, so vàng đang giữ.');else this.win(red>blue?0:1,reason);
        return true;
      }
      if(s.teams.every(t=>t.turns>=TURN_LIMIT)){this.compareGold('Mỗi đội đã hoàn thành '+TURN_LIMIT+' lượt.');return true;}
      return false;
    }
  }
  return Object.freeze({Game,ISLANDS,EDGES,LEG_DISTANCE,TREASURE_DAYS,TREASURE_CLUES,TREASURE_GOLD,TURN_LIMIT,ISLAND_DURABILITY,ISLAND_ATTACK,adjacent,validateQuestions});
});
