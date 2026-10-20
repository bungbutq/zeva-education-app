(function(root){
  'use strict';
  // The production builder pins this directory to a verified immutable commit.
  const BASE = 'audio/';
  const FILES=Object.freeze({
    click:'bấm nút.wav',hover:'di chuột qua nút.wav',victory:'chiến thắng.mp3',
    battle:'đánh nhau hỗ loạn.mp3',chest:'mở rương.mp3',trade:'mua bán.wav',
    upgrade:'nâng cấp.mp3',music:'nhạc nền.ogg',sail:'thuyền di chuyển.mp3',
    correct:'Trả lời đúng.mp3',incorrect:'trả lời sai.mp3'
  });
  const VOLUME={music:.2,hover:.22,click:.35,battle:.65,sail:.5,upgrade:.65};
  function create({AudioClass=root.Audio,document=root.document}={}){
    let enabled=false,disposed=false,musicWanted=true,lastHover=-Infinity;
    const active=new Set();
    let music=null;
    function make(kind){
      const sound=new AudioClass(new URL(BASE+encodeURIComponent(FILES[kind]),document.baseURI).href);
      sound.preload='none';sound.volume=VOLUME[kind]??.65;return sound;
    }
    function allowed(){return enabled&&!disposed&&!document.hidden;}
    function stop(kind){
      for(const entry of [...active])if(!kind||entry.kind===kind){
        entry.sound.pause();entry.sound.currentTime=0;active.delete(entry);
      }
    }
    function syncMusic(){
      if(!allowed()||!musicWanted){music?.pause();return;}
      if(!music){music=make('music');music.loop=true;}
      if(music.paused)try{Promise.resolve(music.play()).catch(()=>{});}catch{}
    }
    function play(kind){
      if(!allowed()||!FILES[kind]||kind==='music')return;
      if(kind==='hover'){
        const now=Date.now();if(now-lastHover<90)return;lastHover=now;
      }
      // Restart repeated UI actions without accumulating sounds or delayed timers.
      stop(kind);
      while(active.size>=8){const oldest=active.values().next().value;oldest.sound.pause();active.delete(oldest);}
      try{
        const sound=make(kind),entry={kind,sound};active.add(entry);
        const release=()=>active.delete(entry);
        sound.addEventListener('ended',release,{once:true});
        sound.addEventListener('error',release,{once:true});
        Promise.resolve(sound.play()).catch(release);
      }catch{/* Audio failures never block gameplay. */}
    }
    function setEnabled(value){
      enabled=!!value;
      if(!enabled)stop();
      syncMusic();
    }
    function setMusic(value){musicWanted=!!value;syncMusic();}
    function visibility(){if(document.hidden)stop();syncMusic();}
    function dispose(){disposed=true;stop();music?.pause();document.removeEventListener('visibilitychange',visibility);}
    document.addEventListener('visibilitychange',visibility);
    return Object.freeze({play,stop,setEnabled,setMusic,dispose,get enabled(){return enabled;}});
  }
  root.TreasureAudio=Object.freeze({create,files:FILES});
})(typeof window==='undefined'?globalThis:window);
