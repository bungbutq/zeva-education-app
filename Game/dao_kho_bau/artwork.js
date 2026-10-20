(function(root){
  'use strict';
  // World coordinates share the 1600x900 map and existing engine destinations.
  const islands=[
    {id:1,name:'Núi Lửa',file:'island-01-volcano.png',width:350,height:234,effect:'volcano'},
    {id:2,name:'Đá Đầu Lâu',file:'island-02-skull.png',width:350,height:218},
    {id:3,name:'Hải Đăng',file:'island-03-lighthouse.png',width:350,height:222,effect:'lighthouse'},
    {id:4,name:'Phế Tích',file:'island-04-ruins.png',width:350,height:208},
    {id:5,name:'Thác Nước',file:'island-05-waterfall-hd.png',width:350,height:202,effect:'waterfall'},
    {id:6,name:'Làng Bến Cảng',file:'island-06-village-hd.png',width:350,height:198,effect:'villagers'},
    {id:7,name:'Vịnh Cua Khổng Lồ',file:'island-07-crab-base-hd.png',width:350,height:198,effect:'crab'},
    {id:8,name:'Tàu Đắm',file:'island-08-shipwreck.png',width:350,height:208},
    {id:9,name:'Tháp Canh',file:'island-09-lookout-hd.png',width:350,height:202,effect:'guards'},
    {id:10,name:'Tượng Đá',file:'island-10-totem-hd.png',width:350,height:202,effect:'birds'},
    {id:11,name:'Hang Bí Mật',file:'island-11-cave-hd.png',width:350,height:202,effect:'cave'},
    {id:12,name:'Đảo Pha Lê',file:'island-12-crystal.png',width:350,height:234,effect:'crystal'},
    {id:13,name:'Đảo Rùa',file:'island-13-turtle.png',width:350,height:210},
    {id:14,name:'Pháo Đài',file:'island-14-fortress.png',width:350,height:218},
    {id:15,name:'Rừng Ngập Mặn',file:'island-15-mangrove-hd.png',width:350,height:202,effect:'fish'},
    {id:16,name:'Đảo Nấm',file:'island-16-mushroom.png',width:350,height:222,effect:'spores'},
    {id:17,name:'Vịnh Tiên Cá',file:'island-17-mermaid-bay.png',width:350,height:208,effect:'mermaids'},
    {id:18,name:'Đá Rồng',file:'island-18-dragon.png',width:350,height:234,effect:'dragon-smoke'},
    {id:19,name:'Đảo Sấm Sét',file:'island-19-thunder.png',width:350,height:234,effect:'thunder'},
    {id:20,name:'Cối Xay Gió',file:'island-20-windmill.png',width:350,height:234,effect:'windmill'},
    {id:21,name:'Đảo Kiếm',file:'island-21-sword.png',width:350,height:234,effect:'holy'},
    {id:22,name:'Đảo Hóa Thạch',file:'island-22-fossil.png',width:350,height:218},
    {id:23,name:'Vùng Kraken',file:'island-23-kraken.png',width:350,height:218,effect:'kraken'},
    {id:24,name:'Vùng Cá Voi',file:'island-24-whale.png',width:350,height:208,effect:'whale'},
    {id:25,name:'Đảo Sương Mù',file:'island-25-mist-clear.png',width:350,height:234,effect:'fog'},
    {id:26,name:'Vùng Bão Tố',file:'island-26-storm-base.png',width:350,height:234,effect:'storm'},
    {id:27,name:'Bãi Cạn',file:'island-27-sandbar.png',width:350,height:202},
    {id:28,name:'Vùng Băng Trôi',file:'island-28-drift-ice.png',width:350,height:218,effect:'penguins'},
    {id:29,name:'Vùng Đá Ngầm',file:'island-29-reef-rocks.png',width:350,height:218,effect:'reef'},
    {id:30,name:'Đảo Tuyết',file:'island-30-snow.png',width:350,height:234,effect:'snow'},
    {id:31,name:'Hoa Quả Sơn',file:'island-31-fruit-base.png',width:350,height:234,effect:'fruit'},
    {id:32,name:'Đảo Anh Đào',file:'island-32-sakura.png',width:350,height:234,effect:'sakura'},
    {id:33,name:'Đảo Thổ Dân',file:'island-33-island-village.png',width:350,height:222,effect:'tribal'},
    {id:34,name:'Đảo Rắn',file:'island-34-snake-base.png',width:350,height:218,effect:'snake'},
    {id:35,name:'Vùng Cá Mập',file:'island-35-sharks-base.png',width:350,height:208,effect:'sharks'},
    {id:36,name:'Đảo San Hô',file:'island-36-coral.png',width:350,height:208,effect:'coral'}
  ];
  const bases=[
    {id:37,name:'Dover',file:'base-blue-dover.png',width:350,height:234,baseTeam:1},
    {id:38,name:'Bristol',file:'base-red-bristol.png',width:350,height:234,baseTeam:0}
  ];
  islands.push(...bases);
  function shuffledIslands(rng=Math.random,count=24,krakenPosition,edges){
    if(count!==24)throw Error('Bản đồ cần ba vùng, mỗi vùng tám đảo.');
    return root.TreasureIslandRules.selectThemes(rng,krakenPosition,edges).map(t=>islands.find(i=>i.id===t.id));
  }
  function clouds(){
    return '<div class="weather-cloud" aria-hidden="true">'+[[4,46,29,48],[20,16,30,69],[40,1,32,79],[62,27,30,61],[77,49,23,44],[12,53,38,44],[39,42,38,54],[63,55,30,42]].map(([x,y,w,h],i)=>'<i style="left:'+x+'%;top:'+y+'%;width:'+w+'%;height:'+h+'%;--p:'+i+'"></i>').join('')+'</div>';
  }
  function windmill(){
    const blade='<path d="M-9-9 L-9-218 Q-9-224-3-224 L66-224 L66-80 L8-25Z" fill="#f5dfac" stroke="#70471f" stroke-width="7"/><path d="M0 0V-229 M0-191H64 M0-154H64 M0-117H64 M31-223V-78" fill="none" stroke="#ac793e" stroke-width="7"/><path d="M4-216V-29" stroke="#e2b677" stroke-width="3"/>';
    return '<svg class="island-effect windmill-sails" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(838 260)"><g class="windmill-rotor">'+[0,90,180,270].map(angle=>'<g transform="rotate('+angle+')">'+blade+'</g>').join('')+'<circle r="27" fill="#bd8948" stroke="#70451d" stroke-width="7"/><circle r="11" fill="#e4b773" stroke="#795023" stroke-width="5"/></g></g></svg>';
  }
  function effects(kind){
    if(root.TreasureAtmosphere.kinds.includes(kind))return root.TreasureAtmosphere.markup(kind)+(kind==='tribal'?root.TreasureLife.markup('residents'):kind==='fruit'?root.TreasureLife.markup('monkeys'):'');
    if(['crab','fish','guards','villagers','birds','storm','snake','sharks','mermaids','penguins'].includes(kind))return root.TreasureLife.markup(kind);
    if(kind==='kraken')return '<div class="kraken-tentacles">'+[[-2,-25,1,76],[12,-17,1,86],[25,4,1,72],[45,-4,-1,74],[58,17,-1,84],[73,25,-1,76],[23,-52,1,48],[48,52,-1,48]].map(([x,tilt,flip,h],i)=>'<i style="left:'+x+'%;height:'+h+'%;--tilt:'+tilt+'deg;--flip:'+flip+';--p:'+i+'"><img src="assets/kraken-tentacle.png" alt=""></i>').join('')+'</div><div class="creature-wake"></div>';
    if(kind==='whale')return '<canvas class="island-liquid whale-swim" data-liquid="whale" aria-hidden="true"></canvas><div class="creature-wake whale-wake"></div>';
    if(kind==='rain')return '<div class="island-weather dragon-weather">'+clouds()+'<div class="island-rain">'+Array.from({length:36},(_,i)=>'<i style="--p:'+i+';left:'+(i*29%100)+'%"></i>').join('')+'</div></div>';
    if(kind==='windmill')return windmill();
    if(kind==='holy')return '<div class="holy-light"><i class="holy-ray"></i><i class="holy-ray second"></i><i class="holy-ray third"></i><i class="holy-halo"></i>'+Array.from({length:12},(_,i)=>'<i class="holy-spark" style="--p:'+i+';left:'+(37+i*19%28)+'%"></i>').join('')+'</div>';
    if(kind==='volcano')return '<canvas class="island-liquid" data-liquid="volcano" aria-hidden="true"></canvas><div class="volcano-smoke">'+Array.from({length:14},(_,i)=>'<i style="--p:'+i+'"></i>').join('')+'</div><div class="crater-glow"></div><svg class="island-effect" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true"><g class="lava-bed"><path d="M749 170 C716 220 696 289 664 325 S628 421 594 452 S566 482 566 514"/><path d="M821 181 C824 242 839 260 822 303 S807 382 820 424 S871 475 915 488 S1000 544 1016 568 S1097 613 1169 627 M960 508 C927 551 884 579 905 619 S945 666 924 700 S854 726 801 734 M690 658 Q708 712 649 746"/><path d="M910 214 C930 269 898 302 913 335 S952 410 951 474"/></g><g class="lava-flow"><path d="M749 170 C716 220 696 289 664 325 S628 421 594 452 S566 482 566 514"/><path d="M821 181 C824 242 839 260 822 303 S807 382 820 424 S871 475 915 488 S1000 544 1016 568 S1097 613 1169 627 M960 508 C927 551 884 579 905 619 S945 666 924 700 S854 726 801 734 M690 658 Q708 712 649 746"/><path d="M910 214 C930 269 898 302 913 335 S952 410 951 474"/></g></svg><div class="volcano-embers">'+Array.from({length:5},(_,i)=>'<i style="--p:'+i+'"></i>').join('')+'</div>';
    if(kind==='waterfall'){
      const upper=[584,604,624,688,708,730,768,788].map((x,i)=>'<path style="--p:'+i+'" d="M'+x+' 211 Q'+(x+27)+' 250 '+(x+28)+' 335"/>').join('');
      const lower=Array.from({length:15},(_,i)=>{const x=755+i*15;return '<path style="--p:'+i+'" d="M'+x+' 429 C'+(x+24)+' 475 '+(x+23)+' 555 '+(x+35)+' '+(i<4?637:695)+'"/>';}).join('');
      return '<canvas class="island-liquid" data-liquid="waterfall" aria-hidden="true"></canvas><svg class="island-effect waterfall-streams" viewBox="0 0 1536 1024" preserveAspectRatio="none" aria-hidden="true"><g class="waterfall-flow upper">'+upper+'</g><g class="waterfall-flow lower">'+lower+'</g></svg><div class="waterfall-mist upper"></div><div class="waterfall-mist lower"></div><div class="waterfall-spray">'+Array.from({length:12},(_,i)=>'<i style="--p:'+i+'"></i>').join('')+'</div>';
    }
    if(kind==='cave')return '<div class="cave-glow"></div><div class="cave-fire"><i></i><i></i><i></i></div>';
    return '';
  }
  root.TreasureArtwork=Object.freeze({islands,files:['ui-port-pass.png','ui-port-raid.png','ui-rules-frame.png','ocean-water.png','map-foreground.png','ui-picker-frame-clean.png','kraken-tentacle.png','sprite-giant-crab.png','sprite-mangrove-fish.png','sprite-guard-walk.png','sprite-villagers-walk.png','sprite-totem-bird.png','sprite-shark-overhead.png','sprite-snake-overhead.png','sprite-island-patrol.png','sprite-mermaid-poses-v2.png','sprite-monkey-climb.png','sprite-penguin-walk.png','island-26-storm.png',...islands.map(i=>i.file)],effects,shuffledIslands});
})(window);
