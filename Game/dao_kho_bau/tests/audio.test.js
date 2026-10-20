'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
require('../audio.js');
function fixture(){
  const instances=[],listeners={};
  class Audio {
    constructor(src){this.src=src;this.paused=true;this.plays=0;this.events={};instances.push(this);}
    play(){this.paused=false;this.plays++;return Promise.resolve();}
    pause(){this.paused=true;}
    addEventListener(name,cb){this.events[name]=cb;}
  }
  const document={baseURI:'https://example.test/Game/dao_kho_bau/',hidden:false,addEventListener:(n,f)=>listeners[n]=f,removeEventListener:n=>delete listeners[n]};
  const api=globalThis.TreasureAudio.create({AudioClass:Audio,document});
  const sounds=kind=>instances.filter(a=>decodeURIComponent(a.src).endsWith(globalThis.TreasureAudio.files[kind]));
  return {api,document,listeners,sounds,instances};
}
test('muted by default; music loops once; new upgrade file plays exactly once',async()=>{
  const f=fixture();f.api.play('upgrade');assert.equal(f.instances.length,0);
  f.api.setEnabled(true);f.api.setEnabled(true);
  assert.equal(f.sounds('music').length,1);assert.equal(f.sounds('music')[0].plays,1);assert.equal(f.sounds('music')[0].loop,true);
  f.api.play('upgrade');assert.equal(f.sounds('upgrade').length,1);assert.equal(f.sounds('upgrade')[0].plays,1);
  assert.match(decodeURIComponent(f.sounds('upgrade')[0].src),/nâng cấp\.mp3$/);
  assert.notEqual(f.sounds('upgrade')[0].loop,true);
  f.api.setEnabled(false);assert.ok(f.instances.every(a=>a.paused));
});
test('hide cancels effects; visibility resumes only music; disposal prevents late playback',()=>{
  const f=fixture();f.api.setEnabled(true);f.api.play('battle');f.document.hidden=true;f.listeners.visibilitychange();
  assert.ok(f.instances.every(a=>a.paused));f.api.play('chest');assert.equal(f.sounds('chest').length,0);
  f.document.hidden=false;f.listeners.visibilitychange();assert.equal(f.sounds('music')[0].plays,2);
  assert.equal(f.sounds('battle')[0].plays,1);
  f.api.dispose();f.api.setEnabled(true);f.api.play('victory');assert.ok(f.instances.every(a=>a.paused));assert.equal(f.sounds('victory').length,0);
});
test('rapid hover is throttled; same effect restarts; victory can pause music',()=>{
  const f=fixture();f.api.setEnabled(true);f.api.play('hover');f.api.play('hover');assert.equal(f.sounds('hover').length,1);
  f.api.play('trade');f.api.play('trade');assert.equal(f.sounds('trade')[0].paused,true);assert.equal(f.sounds('trade')[1].paused,false);
  f.api.setMusic(false);assert.equal(f.sounds('music')[0].paused,true);
});
test('rejected browser playback is handled without uncaught rejection',async()=>{
  const doc={baseURI:'https://example.test/',hidden:false,addEventListener(){},removeEventListener(){}};
  class Blocked {play(){return Promise.reject(new Error('NotAllowedError'));}pause(){}addEventListener(){}}
  const api=globalThis.TreasureAudio.create({AudioClass:Blocked,document:doc});
  api.setEnabled(true);api.play('correct');await new Promise(r=>setImmediate(r));api.dispose();
});
test('click and sailing gain doubled; awaited upgrade resolves only at completion or cancellation',async()=>{
  const f=fixture();f.api.setEnabled(true);
  f.api.play('click');f.api.play('sail');
  assert.equal(f.sounds('click')[0].volume,.7);assert.equal(f.sounds('sail')[0].volume,1);
  let done=false;const finished=f.api.play('upgrade',{wait:true}).then(()=>done=true);
  await Promise.resolve();assert.equal(done,false);
  f.sounds('upgrade')[0].events.ended();await finished;assert.equal(done,true);
  const cancelled=f.api.play('upgrade',{wait:true});f.api.setEnabled(false);await cancelled;
  f.api.dispose();
});
