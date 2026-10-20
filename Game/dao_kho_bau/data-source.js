(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;else root.TreasureSource=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const norm=v=>String(v||'').normalize('NFC').toLowerCase().replace(/\s+/g,' ').trim();
  function cleanWords(raw){
    const input=(Array.isArray(raw)?raw:[]).map(w=>({word:String(w?.word||'').normalize('NFC').trim(),meaning:String(w?.meaning||'').normalize('NFC').trim()}));
    const meanings=new Map(),seen=new Set();
    for(const w of input){const k=norm(w.word);if(!meanings.has(k))meanings.set(k,new Set());meanings.get(k).add(norm(w.meaning));}
    return input.filter(w=>{const m=norm(w.meaning);if(!norm(w.word)||!m||meanings.get(norm(w.word)).size!==1||seen.has(m))return false;seen.add(m);return true;});
  }
  function shuffle(values,rng){const a=values.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function fromWords(raw,rng=Math.random){
    const words=cleanWords(raw);
    if(words.length<4)throw Error('Bài học cần ít nhất 4 từ có nghĩa khác nhau, không mâu thuẫn.');
    const deck=[];let order=[];
    for(let i=0;i<Math.max(32,Math.min(500,words.length));i++){
      if(!order.length)order=shuffle(words,rng);
      const w=order.pop(),options=shuffle([w.meaning,...shuffle(words.filter(x=>x!==w),rng).slice(0,3).map(x=>x.meaning)],rng);
      deck.push({text:'“'+w.word+'” có nghĩa là gì?',options,answer:options.indexOf(w.meaning),explanation:w.word+' = '+w.meaning});
    }
    return deck;
  }
  function createBridge(win){
    const boot=win.TREASURE_BOOTSTRAP;
    if(!boot||boot.mode!=='zeva'||typeof boot.channel!=='string'||win.parent===win)return null;
    const pending=new Map();let sequence=0;
    win.addEventListener('message',event=>{
      if(event.source!==win.parent||event.data?.type!=='zeva-treasure-result'||event.data?.channel!==boot.channel)return;
      if(boot.parentOrigin&&boot.parentOrigin!=='null'&&event.origin!==boot.parentOrigin)return;
      const item=pending.get(event.data.id);if(!item)return;
      clearTimeout(item.timer);pending.delete(event.data.id);
      if(event.data.ok)item.resolve(event.data.data);else item.reject(Error(event.data.error||'Không tải được dữ liệu lớp.'));
    });
    const target=boot.parentOrigin&&boot.parentOrigin!=='null'?boot.parentOrigin:'*';
    return {
      read(action,classCode,lessonKey){
        const id=String(++sequence);
        return new Promise((resolve,reject)=>{
          const timer=setTimeout(()=>{pending.delete(id);reject(Error('Tải dữ liệu quá lâu. Hãy thử lại.'));},28000);
          pending.set(id,{resolve,reject,timer});
          win.parent.postMessage({type:'zeva-treasure-read',channel:boot.channel,id,action,classCode,lessonKey},target);
        });
      },
      close(){win.parent.postMessage({type:'zeva-treasure-close',channel:boot.channel},target);}
    };
  }
  return Object.freeze({cleanWords,fromWords,createBridge});
});
