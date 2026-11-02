/* Top-level PWA only: notification permission must be requested from a user gesture. */
(() => {
  let options,button,registration,key,owner='',generation=0,busy=false;
  const api=()=>window.ZEVA_WEBAPP_CONFIG?.pushApiUrl;
  const session=()=>options?.session?.();
  const supported=()=>isSecureContext&&'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;
  async function post(route,body){
    if(!/^https:\/\/[a-z0-9.-]+$/i.test(api()||''))throw new Error('Thông báo chưa được cấu hình.');
    const response=await fetch(api()+route,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),credentials:'omit',signal:AbortSignal.timeout(15000)});
    const value=await response.json();if(!response.ok||!value.ok)throw new Error('Chưa kết nối được dịch vụ thông báo. Vui lòng thử lại.');return value;
  }
  const bindingStore=async binding=>{
    const cache=await caches.open('zeva-push-state-v1');
    await cache.put(new URL('./__push_binding',location.href),new Response(binding));
  };
  const readBinding=async()=>{const value=await (await caches.open('zeva-push-state-v1')).match(new URL('./__push_binding',location.href));return value?value.text():'';};
  function label(text){button.textContent=text;button.hidden=!session();options?.onStatus?.({text,busy});}
  async function prepare(){
    if(!supported())return;
    registration=await navigator.serviceWorker.register('./service-worker.js');
    await navigator.serviceWorker.ready;
    key=(await post('/push/config',{})).publicKey;
  }
  async function bind(){
    const current=session();if(!current?.token||!supported()||Notification.permission!=='granted')return;
    if(owner===current.token)return;
    const turn=++generation;await bindingStore('');
    if(!registration||!key)await prepare();
    let subscription=await registration.pushManager.getSubscription();
    if(!subscription){
      const raw=atob(key.replace(/-/g,'+').replace(/_/g,'/'));
      subscription=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:Uint8Array.from(raw,c=>c.charCodeAt(0))});
    }
    if(turn!==generation||session()?.token!==current.token)return;
    const binding=crypto.randomUUID();
    await bindingStore(binding);
    await post('/push/subscribe',{token:current.token,subscription:subscription.toJSON(),binding});
    if(turn!==generation||session()?.token!==current.token)return;
    owner=current.token;label('Thông báo: đang bật');
  }
  async function refresh(){
    if(!button)return;
    if(owner&&owner!==session()?.token){owner='';generation++;await bindingStore('');}
    label(owner&&owner===session()?.token?'Thông báo: đang bật':'Bật thông báo');
    if(!session()){owner='';generation++;await bindingStore('');return;}
    if(supported()&&Notification.permission==='granted'&&localStorage.getItem('zeva-push-disabled')!=='1')await bind();
    else await bindingStore('');
  }
  async function click(){
    if(busy)return;
    if(!supported())return alert('Hãy thêm ZEVA vào màn hình chính rồi mở từ biểu tượng ứng dụng để bật thông báo.');
    busy=true;button.disabled=true;options?.onStatus?.({text:button.textContent,busy});
    try {
      if(owner===session()?.token){
        localStorage.setItem('zeva-push-disabled','1');
        const sub=await registration.pushManager.getSubscription(),binding=await readBinding(),token=session().token;
        generation++;owner='';await bindingStore('');
        if(sub){await sub.unsubscribe();await post('/push/unsubscribe',{token,endpoint:sub.endpoint,binding});}
        label('Bật thông báo');return;
      }
      const permission=await Notification.requestPermission();
      if(permission!=='granted')return alert('Chưa được cấp quyền thông báo. Bạn có thể bật quyền trong cài đặt trình duyệt/ứng dụng.');
      localStorage.removeItem('zeva-push-disabled');await bind();
    } catch(error){label('Thử bật thông báo lại');alert(error.message||'Chưa bật được thông báo.');}
    finally{busy=false;button.disabled=false;options?.onStatus?.({text:button.textContent,busy});}
  }
  let pendingOpen=new URL(location.href).searchParams.has('zevaNotification');
  function ready(){if(pendingOpen&&session()){pendingOpen=false;options.openInbox();const url=new URL(location.href);url.searchParams.delete('zevaNotification');history.replaceState(null,'',url);}}
  window.ZevaPush={init(value){
    options=value;button=document.createElement('button');button.type='button';button.hidden=true;
    button.style.cssText='position:fixed;right:12px;bottom:12px;z-index:2147483000;padding:9px 14px;border:1px solid #c3d4eb;border-radius:18px;background:#fff;color:#15375d;font:600 13px Arial;box-shadow:0 2px 10px #16345426';
    button.addEventListener('click',click);
    navigator.serviceWorker?.addEventListener('message',event=>{if(event.data?.type==='ZEVA_PUSH_OPEN'){pendingOpen=true;ready();}});
    window.addEventListener('storage',()=>void refresh().catch(()=>{}));
    void refresh().catch(()=>{});
  },toggle:click,refresh:()=>void refresh().catch(()=>{}),ready};
})();
