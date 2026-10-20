(function(root){
  'use strict';
  const Y=root.TreasureShipyard,T=root.TreasureTrade,$=id=>document.getElementById(id);
  const iconBoxes={cannon:'20 65 620 555',cargo:'644 65 590 555',sail:'45 630 590 590',gold:'680 675 530 510'};
  const pickaxe='<g stroke="#46250f" stroke-width="2.5" stroke-linejoin="round"><path d="M36 18 43 23 20 59Q16 63 12 59L11 56Z" fill="#b97731"/><path d="m35 24 3 2-21 31-2-2Z" fill="#f5c678" stroke="none"/><path d="M5 28Q15 10 34 9L39 5 47 11 44 17Q55 26 60 43L48 32Q38 22 29 22 16 22 5 28Z" fill="#859aa9"/><path d="M5 28Q15 10 34 9L39 5 43 8 36 15Q17 15 5 28Z" fill="#dfedf3" stroke="none"/><path d="m34 9 10 8-6 9-11-8Z" fill="#d39c3f"/><path d="m35 13 5 4-2 4-6-4Z" fill="#ffdf7c" stroke="none"/></g>';
  const meal='<g stroke="#593015" stroke-width="2.5" stroke-linejoin="round"><ellipse cx="30" cy="37" rx="24" ry="18" fill="#dda54c"/><ellipse cx="30" cy="34" rx="21" ry="15" fill="#fff1be"/><path d="M15 34c-5-9 2-18 11-14 5-11 18-5 17 4 10 5 4 16-5 16H22Z" fill="#d88b35"/><path d="m24 25 4 4m4-7 4 5m-4 5 4 4" stroke="#ffe6a0" stroke-linecap="round"/><path d="M53 10v15m-5-15v9q0 7 5 7t5-7v-9m-5 16v29" fill="none" stroke="#f8df83" stroke-width="4" stroke-linecap="round"/></g>';
  const hunger='<g stroke="#542015" stroke-width="2.5" stroke-linejoin="round"><path d="M8 47h39l-8 10H18Z" fill="#f4c46b"/><path d="M28 6v39M25 10 8 39h17Z" fill="#fff0bf"/><path d="M31 12v27h16Z" fill="#e6b35c"/><path d="M49 23h9v17h5L53 53 43 40h6Z" fill="#ff6655" stroke="#fff0bf"/></g>';
  const icon=(kind,cls)=>['pass','raid'].includes(kind)?'<img class="'+cls+'" src="assets/ui-port-'+kind+'.png" alt="">':['harvest','consumption','hunger'].includes(kind)?'<svg class="'+cls+'" data-icon="'+kind+'" viewBox="0 0 64 64" aria-hidden="true">'+(kind==='harvest'?pickaxe:kind==='hunger'?hunger:meal)+'</svg>':['hull','provisions'].includes(kind)?'<img class="'+cls+'" data-icon="'+kind+'" src="assets/ui-upgrade-'+kind+'.png" alt="">':'<svg class="'+cls+'" data-icon="'+kind+'" viewBox="'+iconBoxes[kind]+'" aria-hidden="true"><image href="assets/ui-upgrade-icons.png" width="1280" height="1280"/></svg>';
  function create({onUpgrade,onDepart,onSell}){
    let lastKey='',context='',mode='yard',current=null,lastBusy=false,lastPreview=false,marketPreview=null;
    const tools=document.querySelector('.map-tools');
    const water=root.TreasurePortWater.create({layer:$('port-layer'),backdrop:$('port-backdrop'),canvas:$('port-water'),foreground:$('port-water-front'),ship:$('port-ship')});
    $('port-depart').addEventListener('click',onDepart);
    $('merchant-button').addEventListener('click',()=>{
      if(!current||lastBusy)return;
      if(!$('port-layer').hidden&&current.state.phase==='PORT'){mode='shop';render(current,lastBusy);$('port-depart').focus({preventScroll:true});}
      else if(current.state.phase==='MAP'||lastPreview){marketPreview=current.actor.id+':'+current.state.turn;render(current,lastBusy,lastPreview);$('port-shop').querySelector('.merchant-list').focus({preventScroll:true});}
    });
    function focusSale(id){
      const next=$('port-shop').querySelector('[data-sell="'+id+'"]');
      (next&&!next.disabled?next:$('port-shop').querySelector('.merchant-list'))?.focus({preventScroll:true});
    }
    function bindShopSales(){
      for(const row of $('port-shop').querySelectorAll('[data-product]')){
        const id=Number(row.dataset.product),item=T.product(id),input=row.querySelector('[data-sale-quantity]'),sell=row.querySelector('[data-sell]');
        const decrease=row.querySelector('[data-quantity-step="-1"]'),increase=row.querySelector('[data-quantity-step="1"]'),error=row.querySelector('.merchant-row-error');
        const validate=()=>{
          const owned=T.owned(current.actor,item),quantity=input.valueAsNumber;
          const valid=Number.isInteger(quantity)&&quantity>=1&&quantity<=owned;
          const message=owned&&!valid?'Nhập số nguyên từ 1 đến '+owned+'.':'';
          input.setCustomValidity(message);input.setAttribute('aria-invalid',String(!!message));
          sell.disabled=!valid;decrease.disabled=!owned||(Number.isFinite(quantity)&&quantity<=1);increase.disabled=!owned||(Number.isFinite(quantity)&&quantity>=owned);
          error.textContent=message;error.hidden=!message;return valid;
        };
        input.addEventListener('input',validate);
        for(const control of [decrease,increase])control.addEventListener('click',()=>{
          const owned=T.owned(current.actor,item);if(!owned)return;
          const value=Number.isInteger(input.valueAsNumber)?input.valueAsNumber:1;
          input.value=String(Math.max(1,Math.min(owned,value+Number(control.dataset.quantityStep))));validate();
        });
        sell.addEventListener('click',()=>{
          if(lastBusy||marketPreview||current?.state.phase!=='PORT'||mode!=='shop'||!validate())return;
          const quantity=input.valueAsNumber;sell.disabled=true;
          // Direct clicks work inside the game sandbox without allowing form submission.
          if(onSell(id,quantity))focusSale(id);
          else{validate();error.textContent='Chưa bán được sản vật. Hãy thử lại.';error.hidden=false;}
        });
        validate();
      }
    }
    function render(game,busy,preview=false){
      current=game;lastBusy=busy;lastPreview=preview;
      if(!game||busy||marketPreview!==game.actor.id+':'+game.state.turn||(!preview&&game.state.phase!=='MAP'))marketPreview=null;
      const browsing=!!marketPreview,onMap=!!game&&!busy&&(preview||game.state.phase==='MAP');
      const visible=browsing||!!game&&!busy&&!preview&&game.state.phase==='PORT';
      $('port-layer').hidden=!visible;$('stage').classList.toggle('port-active',visible);
      $('stage').classList.toggle('merchant-preview',browsing);$('map-button').hidden=onMap&&!browsing;
      $('port-depart').hidden=browsing;
      $('merchant-button').hidden=!visible;
      if(!visible){if(!preview){lastKey='';context='';mode='yard';}$('stage').classList.remove('merchant-active');$('port-layer').append($('port-depart'));tools.append($('merchant-button'),$('map-button'),$('ship-button'),$('game-home'),$('sound-button'));$('merchant-button').hidden=!onMap;$('merchant-button').setAttribute('aria-pressed','false');$('ship-button').hidden=false;$('ship-button').setAttribute('aria-label','Chiến thuyền');$('ship-button').title='Chiến thuyền';water.setActive(false);return;}
      $('map-viewport').inert=true;
      const t=game.actor,base=game.base||Y.BASES.find(b=>b.team===t.id),u=t.upgrades;
      const nextContext=t.id+':'+base.id;if(!browsing&&context!==nextContext){mode='yard';context=nextContext;$('port-upgrades').scrollTop=0;}
      const shop=browsing||mode==='shop',merchant=T.MERCHANTS[base.color];
      $('stage').classList.toggle('merchant-active',shop);$('merchant-button').hidden=shop;$('ship-button').hidden=!shop;
      if(browsing)tools.append($('map-button'),$('ship-button'),$('game-home'),$('sound-button'));
      else tools.append(shop?$('ship-button'):$('merchant-button'),$('map-button'),$('port-depart'),$('game-home'),$('sound-button'));
      const key=[t.id,base.id,t.gold,...Object.values(u),mode,game.state.notice].join(':');

      const fresh=!lastKey,focused=document.activeElement?.dataset.upgrade;lastKey=key;
      $('port-layer').className='port-'+base.color+(shop?' merchant-open':'');
      const harbor='assets/'+(shop?merchant.image:base.harbor);if($('port-backdrop').getAttribute('src')!==harbor)$('port-backdrop').src=harbor;
      $('port-city-name').textContent=shop?merchant.name:base.name;
      $('port-owner').textContent=browsing?'Chỉ xem giá · '+base.name:shop?'Gian thương · '+base.name:'Căn cứ '+(base.team?'Xanh':'Đỏ')+' · Đảo '+base.id;
      const title=shop?'Cửa hàng của gian thương':'Nâng cấp tàu chiến';
      $('port-title').innerHTML='<svg class="port-title-curve" viewBox="0 0 600 110" preserveAspectRatio="none" role="img" aria-label="'+title+'"><defs><path id="port-title-arc" d="M16 104 Q300 40 584 104"/></defs><text><textPath href="#port-title-arc" startOffset="50%" text-anchor="middle">'+title+'</textPath></text></svg>';
      $('ship-button').setAttribute('aria-label',shop&&!browsing?'Về cảng nâng cấp tàu':'Chiến thuyền');$('ship-button').title=shop&&!browsing?'Về cảng nâng cấp tàu':'Chiến thuyền';
      $('port-upgrades').hidden=shop;$('port-shop').hidden=!shop;$('port-ship').hidden=shop;$('port-water').hidden=shop;$('port-water-front').hidden=shop;
      $('merchant-button').setAttribute('aria-pressed',String(shop));
      $('port-ship').src='assets/'+Y.filename(t.id,u);
      $('port-ship').alt=t.name+': Thân tàu Lv'+u.hull+', '+Y.cannonCount(u.cannon)+' khẩu đại bác trong '+Y.gunportCount(u.hull)+' cửa, '+Y.sailDescriptions[u.sail];
      $('port-ship').dataset.portScale=String((.78+u.hull*.0733)*1.5);
      water.setActive(!shop,base.color);
      const error=game.state.notice.startsWith('Chưa tải được ảnh tàu.');
      $('port-notice').textContent=error?game.state.notice:'';$('port-notice').hidden=!error;
      if(shop){
        const scrollTop=$('port-shop').querySelector('.merchant-list')?.scrollTop||0;
        const focusedSale=document.activeElement?.dataset.sell;
        $('port-shop').innerHTML=root.TreasureTradeUI.shop(game,{readOnly:browsing,baseId:base.id});
        $('port-shop').querySelector('.merchant-list').scrollTop=scrollTop;
        if(!browsing)bindShopSales();
        if(focusedSale){const next=$('port-shop').querySelector('[data-sell="'+focusedSale+'"]');(next&&!next.disabled?next:$('port-shop').querySelector('.merchant-list')).focus({preventScroll:true});}
        $('port-notice').hidden=true;
        return;
      }
      const upgradeScrollTop=$('port-upgrades').scrollTop;
      $('port-upgrades').replaceChildren();
      for(const item of Y.UPGRADES){
        const level=u[item.id],cost=Y.upgradeCost(level),status=game.upgradeStatus(item.id),row=document.createElement('section');row.className='upgrade-row';row.dataset.upgradeRow=item.id;
        const [description,effect]=item.detail.split(' · ');
        row.innerHTML=icon(item.id,'upgrade-icon')+'<div class="upgrade-body"><h3>'+item.name+' <span class="upgrade-level">Lv '+level+'</span></h3><p class="upgrade-description">'+description+'</p><p class="upgrade-effect">'+effect+'</p></div><div class="upgrade-action"><span class="upgrade-cost" aria-label="'+(cost===null?'Đã đạt cấp tối đa':cost+' vàng')+'"><span>'+(cost===null?'MAX':cost.toLocaleString('vi-VN'))+'</span>'+(cost===null?'':icon('gold','gold-icon'))+'</span><button type="button" class="upgrade-buy" data-upgrade="'+item.id+'">Nâng cấp</button></div>';
        const button=row.querySelector('button');button.disabled=!status.ok;button.title=item.name+': '+status.reason;button.setAttribute('aria-label','Nâng cấp '+item.name+' Lv '+level+' · '+status.reason+(status.ok?' · '+cost+' vàng':''));button.addEventListener('click',()=>onUpgrade(item.id));$('port-upgrades').append(row);
      }
      $('port-upgrades').scrollTop=upgradeScrollTop;
      if(fresh||focused)requestAnimationFrame(()=>{const next=focused&&$('port-upgrades').querySelector('[data-upgrade="'+focused+'"]:not(:disabled)');(next||$('port-depart')).focus({preventScroll:true});});
    }
    function returnToYard(){
      if(marketPreview||mode!=='shop'||lastBusy||current?.state.phase!=='PORT'||$('port-layer').hidden)return false;
      mode='yard';render(current,lastBusy);$('port-depart').focus({preventScroll:true});return true;
    }
    function closeMarketPreview(){if(!marketPreview)return false;marketPreview=null;return true;}
    return {render,returnToYard,closeMarketPreview};
  }
  root.TreasureShipyardUI={create,icon};
})(window);
