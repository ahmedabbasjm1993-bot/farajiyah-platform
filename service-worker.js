/* خدمة إشعارات منصة المدرسة - لا تغيّر بيانات المنصة */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('push',event=>{
  let data={};
  try{data=event.data?event.data.json():{}}catch(e){data={body:event.data?event.data.text():''};}
  const title=data.title||'🔔 منصة المدرسة';
  const options={body:data.body||'لديك إشعار جديد من منصة المدرسة',icon:data.icon||undefined,badge:data.badge||undefined,tag:data.tag||('school-'+Date.now()),renotify:true,data:data.data||{}};
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const list=await clients.matchAll({type:'window',includeUncontrolled:true});
    for(const client of list){if('focus' in client){await client.focus();return;}}
    if(clients.openWindow) await clients.openWindow('./');
  })());
});
self.addEventListener('message',event=>{
  const d=event.data||{};
  if(d.type==='SHOW_NOTIFICATION'){
    event.waitUntil(self.registration.showNotification(d.title||'🔔 منصة المدرسة',{body:d.body||'',tag:d.tag||('school-'+Date.now()),renotify:true,data:d.data||{}}));
  }
});
