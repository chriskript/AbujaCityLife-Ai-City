import type { NeighbourhoodSession } from '../../shared/neighbourhood/presentation.js';
import type { PhoneView,PhoneLease,PhoneAction } from '../../shared/neighbourhood/phone.js';
import type { Communication } from '../../shared/neighbourhood/types.js';
import './resident-phone.css';

const clock=(time:number)=>`${String(Math.floor(time/60)).padStart(2,'0')}:${String(Math.floor(time%60)).padStart(2,'0')}`;
export class ResidentPhone {
 private readonly dialog=document.createElement('dialog');
 private owner:string|null=null;private view:PhoneView|null=null;private lease:PhoneLease|null=null;
 private tab:'chats'|'calls'|'contacts'='chats';private contact:string|null=null;private busy=false;private loading=false;private generation=0;private signature='';private opener:HTMLElement|null=null;
 private poll:ReturnType<typeof setInterval>|null=null;private renewal:ReturnType<typeof setInterval>|null=null;
 private listeners=new AbortController();
 constructor(private readonly session:NeighbourhoodSession){
  this.dialog.id='resident-phone';this.dialog.className='resident-phone';this.dialog.setAttribute('aria-labelledby','phone-title');
  this.dialog.innerHTML=`<header class="phone-top"><span id="phone-clock">00:00</span><span>Town phone</span><button id="phone-close" aria-label="Close resident phone">×</button></header><div class="phone-heading"><p id="phone-owner"></p><h2 id="phone-title">Messages</h2><button id="phone-control">Take phone control</button><p id="phone-mode">Inspecting · autonomy continues</p></div><div id="phone-content" class="phone-content"></div><section id="phone-compose" class="phone-compose"><label for="phone-message">Message</label><textarea id="phone-message" maxlength="160" rows="2" placeholder="Write a message…"></textarea><div class="phone-options"><label>Purpose<select id="phone-purpose"><option value="chat">Conversation</option><option value="request-help">Supply assistance</option></select></label><label>Attach my observation<select id="phone-memory"><option value="">None</option></select></label><label>Delivery quantity<input id="phone-quantity" type="number" min="1" max="6" step="1" value="4" /></label></div><div class="phone-send"><button id="phone-send">Send text</button><button id="phone-call">Call</button></div></section><p id="phone-status" role="status"></p><nav class="phone-tabs" aria-label="Phone apps"><button data-phone-tab="chats" aria-pressed="true">◯<span>Chats</span></button><button data-phone-tab="calls" aria-pressed="false">♧<span>Calls</span></button><button data-phone-tab="contacts" aria-pressed="false">▣<span>Contacts</span></button></nav>`;
  document.body.append(this.dialog);const options={signal:this.listeners.signal};
  this.el('#phone-close').addEventListener('click',()=>{void this.close();},options);
  this.dialog.addEventListener('cancel',event=>{event.preventDefault();void this.close();},options);
  this.dialog.addEventListener('click',event=>{if(event.target===this.dialog)void this.close();},options);
  for(const button of this.dialog.querySelectorAll<HTMLButtonElement>('[data-phone-tab]'))button.addEventListener('click',()=>{this.tab=button.dataset.phoneTab as typeof this.tab;this.signature='';this.render();},options);
  this.el('#phone-control').addEventListener('click',()=>{void this.toggleControl();},options);
  this.el<HTMLTextAreaElement>('#phone-message').addEventListener('input',()=>this.controls(),options);
  this.el('#phone-send').addEventListener('click',()=>this.send('text'),options);this.el('#phone-call').addEventListener('click',()=>this.send('call'),options);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)void this.release();else if(this.dialog.open)void this.load();},options);
 }
 private el<T extends HTMLElement=HTMLElement>(selector:string):T{return this.dialog.querySelector<T>(selector)!;}
 async open(owner:string):Promise<void>{
  if(this.owner!==owner)await this.release();this.owner=owner;this.view=null;this.contact=null;this.signature='';this.generation++;this.opener=document.activeElement as HTMLElement;
  if(!this.dialog.open)this.dialog.showModal();this.el('#phone-content').replaceChildren(this.paragraph('Opening this resident’s phone…'));this.controls();this.stopTimers();await this.load();
  this.poll=setInterval(()=>{if(!document.hidden)void this.load();},2000);this.renewal=setInterval(()=>{void this.renew();},20000);
 }
 private stopTimers(){if(this.poll)clearInterval(this.poll);if(this.renewal)clearInterval(this.renewal);this.poll=null;this.renewal=null;}
 async close(){this.generation++;this.stopTimers();this.dialog.close();this.owner=null;this.opener?.focus();await this.release();}
 async release(){const lease=this.lease;this.lease=null;if(lease)try{await this.session.controlPhone({worldId:lease.worldId,actorId:lease.actorId,operation:'release',leaseId:lease.leaseId});}catch{/* Server expiry is the disconnect fallback. */}this.signature='';this.controls();}
 private async renew(){if(!this.lease || !this.dialog.open || document.hidden)return;const lease=this.lease;try{const renewed=await this.session.controlPhone({worldId:lease.worldId,actorId:lease.actorId,operation:'renew',leaseId:lease.leaseId});if(this.lease?.leaseId===lease.leaseId)this.lease=renewed;}catch{await this.release();this.status('Phone control expired. Take control again to act.');}this.controls();}
 private status(message:string){this.el('#phone-status').textContent=message;}
 private async load(){
  if(!this.owner || this.loading)return;const owner=this.owner,generation=this.generation;this.loading=true;
  try{const view=await this.session.phone(owner);if(generation!==this.generation || owner!==this.owner)return;this.view=view;
   if(this.lease && (this.lease.worldId!==view.worldId || view.control?.actorId!==owner || this.lease.expiresAt<=Date.now()))this.lease=null;
   this.render();
  }catch(error){this.status((error as Error).message);}finally{this.loading=false;}
 }
 private async toggleControl(){
  if(!this.view || this.busy)return;this.busy=true;this.controls();
  try{if(this.lease)await this.release();else this.lease=await this.session.controlPhone({worldId:this.view.worldId,actorId:this.view.owner.id,operation:'acquire'});this.status(this.lease?'You control this phone. Release it to let this resident make new plans.':'Inspecting. This resident decides independently.');this.signature='';await this.load();}
  catch(error){this.status((error as Error).message);}finally{this.busy=false;this.render();}
 }
 private canAct(){return !!this.lease && !!this.view?.canAct && !this.busy && this.lease.expiresAt>Date.now();}
 private name(id:string){return id===this.owner?this.view!.owner.name:this.view!.names[id] ?? 'Unknown contact';}
 private controls(){
  const view=this.view,owned=!!this.lease && this.lease.expiresAt>Date.now();
  this.el<HTMLButtonElement>('#phone-control').textContent=owned?'Release phone control':'Take phone control';
  this.el<HTMLButtonElement>('#phone-control').disabled=this.busy || !view || !!view.control && !owned;
  this.el('#phone-mode').textContent=owned?'Player control · other residents continue':view?.control?'Phone controlled by another observer':'Inspecting · autonomy continues';
  this.el<HTMLButtonElement>('#phone-send').disabled=!this.canAct() || !this.contact || !view?.communication.canContact.includes(this.contact) || !this.el<HTMLTextAreaElement>('#phone-message').value.trim();
  this.el<HTMLButtonElement>('#phone-call').disabled=!this.canAct() || !this.contact || !view?.communication.canCall.includes(this.contact);
  this.el('#phone-compose').hidden=!this.contact && !view?.communication.threads.some(item=>item.recipient===this.owner && item.status==='pending');
  if(view && owned && !view.canAct)this.status(view.reason || 'Finish the current activity first');
 }
 private send(channel:'text'|'call'){
  if(!this.contact || !this.view)return;
  const message=this.el<HTMLTextAreaElement>('#phone-message').value.trim() || 'Do you have time to talk?';
  const purpose=this.el<HTMLSelectElement>('#phone-purpose').value as 'chat'|'request-help',memoryId=this.el<HTMLSelectElement>('#phone-memory').value || null;
  void this.act({type:'communicate',recipient:this.contact,channel,purpose,message,memoryId});
 }
 private async act(action:PhoneAction){
  if(!this.view || !this.lease || !this.canAct())return;const view=this.view,lease=this.lease;this.busy=true;this.controls();
  try{const result=await this.session.phoneAction({id:crypto.randomUUID(),worldId:view.worldId,actorId:view.owner.id,leaseId:lease.leaseId,action});const success=action.type==='communicate'?(action.channel==='call'?'Calling. They decide whether to answer.':'Text sent. A reply is up to them.'):action.type==='propose-transport'?'Delivery offer sent. Waiting for their decision.':action.type==='respond-transport'?'Your decision was sent. Release phone control to continue your plans.':action.type==='end-call'?'Call ended.':action.type==='offer-contact'?'You shared your number.':'Your response was recorded.';this.status(result.accepted?success:`Unable to act: ${result.reason.replaceAll('-',' ')}`);if(result.accepted)this.el<HTMLTextAreaElement>('#phone-message').value='';this.signature='';await this.load();}
  catch(error){this.status((error as Error).message);}finally{this.busy=false;this.signature='';this.render();}
 }
 private button(label:string,run:()=>void,enabled=true){const button=document.createElement('button');button.type='button';button.textContent=label;button.disabled=!enabled;button.addEventListener('click',run);return button;}
 private paragraph(text:string,className=''){const p=document.createElement('p');p.textContent=text;p.className=className;return p;}
 private responses(item:Communication,parent:HTMLElement){
  if(item.recipient!==this.owner || item.status!=='pending')return;
  const group=document.createElement('div');group.className='phone-actions';
  for(const response of ['accept','decline','defer','clarify','ignore'] as const){const label=response==='accept'?(item.channel==='call'?'Answer':'Reply'):response==='clarify'?'Ask a question':response==='defer'?'Later':response==='ignore'?'Ignore':'Decline';
   group.append(this.button(label,()=>{const draft=this.el<HTMLTextAreaElement>('#phone-message').value.trim();if(response==='clarify' && !draft){this.status('Write your question in the message field first.');return;}void this.act({type:'respond-communication',communicationId:item.id,response,message:draft || (response==='accept'?'I can discuss this.':response==='defer'?'I have another priority now.':response==='ignore'?'I choose not to respond.':'I am not available.'),memoryId:null});},this.canAct()));
  }parent.append(group);
 }
 private tasks(item:Communication,parent:HTMLElement){
  const view=this.view!,task=view.tasks.find(task=>task.id===item.taskId);const card=document.createElement('section');card.className='phone-task';
  if(task){card.append(this.paragraph(`${task.quantity} supplies · ${task.status}`));card.append(this.paragraph('Accepted work and completed delivery are separate.'));
   if(task.recipient===this.owner && task.status==='proposed'){
    for(const accept of [true,false])card.append(this.button(accept?'Accept delivery job':'Decline job',()=>{void this.act({type:'respond-transport',taskId:task.id,accept});},this.canAct()));
    card.append(this.button('Clarify job',()=>{const question=this.el<HTMLTextAreaElement>('#phone-message').value.trim();if(!question){this.status('Write your question first.');return;}void this.act({type:'respond-transport',taskId:task.id,accept:'clarify',question});},this.canAct()));
   }parent.append(card);
  }else if(item.initiator===this.owner && item.purpose==='request-help' && item.taskId===null && item.response==='accept' && item.expiresAt>view.time && ['accepted','connected'].includes(item.status) && view.capabilities.includes('propose-transport')){
   card.append(this.paragraph('Discussion accepted. You may make a separate delivery offer.'));
   card.append(this.button('Offer delivery',()=>{const quantity=Number(this.el<HTMLInputElement>('#phone-quantity').value);void this.act({type:'propose-transport',recipient:item.recipient,quantity});},this.canAct()));parent.append(card);
  }
 }
 private render(){
  const view=this.view;if(!view)return;this.el('#phone-clock').textContent=clock(view.time);this.el('#phone-owner').textContent=`${view.owner.name}’s phone`;
  this.el('#phone-title').textContent=this.tab==='chats'?(this.contact?this.name(this.contact):'Messages'):this.tab==='calls'?'Calls':'Contacts';
  for(const tab of this.dialog.querySelectorAll<HTMLButtonElement>('[data-phone-tab]'))tab.setAttribute('aria-pressed',String(tab.dataset.phoneTab===this.tab));
  this.controls();
  const signature=JSON.stringify([view.owner,view.communication,view.tasks,view.canAct,!!this.lease,this.busy,this.tab,this.contact]);if(signature===this.signature)return;this.signature=signature;
  const content=this.el('#phone-content');content.replaceChildren();
  const memory=this.el<HTMLSelectElement>('#phone-memory'),selectedMemory=memory.value;memory.replaceChildren(new Option('None',''),...view.memories.map(item=>new Option(item.detail.slice(0,80),item.id)));if(view.memories.some(item=>item.id===selectedMemory))memory.value=selectedMemory;
  const threads=[...view.communication.threads].sort((a,b)=>a.createdAt-b.createdAt);
  if(this.tab==='contacts'){
   for(const person of view.communication.contacts){const row=this.button(`${person.name}${person.canTransport?' · transport contact':''}`,()=>{this.contact=person.id;this.tab='chats';this.signature='';this.render();});row.className='phone-row';content.append(row);}
   if(!view.communication.contacts.length)content.append(this.paragraph('No phone contacts yet. Introductions and voluntary sharing can change this.'));
   if(view.nearby.length){content.append(this.paragraph('Share my number nearby','phone-note'));for(const person of view.nearby)content.append(this.button(`Share with ${person.name}`,()=>{void this.act({type:'offer-contact',recipient:person.id});},this.canAct()));}
  }else if(this.tab==='calls'){
   for(const item of [...threads].reverse().filter(item=>item.channel==='call')){const card=document.createElement('article');card.className='phone-row';card.append(this.paragraph(`${item.initiator===this.owner?'Outgoing':'Incoming'} · ${this.name(item.initiator===this.owner?item.recipient:item.initiator)}`),this.paragraph(`${clock(item.createdAt)} · ${item.status}`),this.paragraph(item.message));this.responses(item,card);if(item.status==='connected')card.append(this.button('End call',()=>{void this.act({type:'end-call',communicationId:item.id});},this.canAct()));this.tasks(item,card);content.append(card);}
   if(!threads.some(item=>item.channel==='call'))content.append(this.paragraph('No calls yet. Select a saved contact to place one.'));
  }else if(!this.contact){
   const peers=[...new Set([...threads].reverse().filter(item=>item.channel==='text').map(item=>item.initiator===this.owner?item.recipient:item.initiator))];
   for(const peer of peers){const items=threads.filter(item=>item.channel==='text' && [item.initiator,item.recipient].includes(peer)),last=items.at(-1)!;const row=this.button('',()=>{this.contact=peer;this.signature='';this.render();});row.className='phone-row phone-preview';const avatar=document.createElement('span');avatar.className='phone-avatar';avatar.textContent=this.name(peer).slice(0,1);const text=document.createElement('span');text.append(this.paragraph(this.name(peer),'phone-peer'),this.paragraph((last.reply && last.response!=='ignore'?last.reply:last.message).slice(0,80)),this.paragraph(clock(last.createdAt),'phone-note'));row.append(avatar,text);content.append(row);}
   content.append(this.button('Choose a contact',()=>{this.tab='contacts';this.signature='';this.render();}));
  }else{
   content.append(this.button('‹ All messages',()=>{this.contact=null;this.signature='';this.render();}));
   for(const item of threads.filter(item=>[item.initiator,item.recipient].includes(this.contact!))){
    const bubble=this.paragraph(item.message,`phone-bubble ${item.initiator===this.owner?'outgoing':'incoming'}`);bubble.append(this.paragraph(`${clock(item.createdAt)} · ${item.channel}${item.initiator===this.owner?(item.delivered?' · delivered':' · sending'):''}`,'phone-note'));content.append(bubble);
    if(item.reply && item.response!=='ignore'){const response=this.paragraph(item.reply,`phone-bubble ${item.recipient===this.owner?'outgoing':'incoming'}`);response.append(this.paragraph(`${item.response}${item.recipient===this.owner&&!item.responseNotified?' · sending':''}`,'phone-note'));content.append(response);}
    this.responses(item,content);this.tasks(item,content);if(item.channel==='call' && item.status==='connected')content.append(this.button('End call',()=>{void this.act({type:'end-call',communicationId:item.id});},this.canAct()));
   }
   const saved=view.communication.contacts.some(person=>person.id===this.contact);
   if(!saved)content.append(this.paragraph('This contact is not saved. You can respond to a delivered invitation, but cannot start another call or text.','phone-note'));
   else if(!view.communication.canContact.includes(this.contact))content.append(this.paragraph('Another exchange or the pair cooldown prevents a new message right now. You can still respond to an open invitation.','phone-note'));
  }
 }
 dispose(){this.stopTimers();void this.release();this.listeners.abort();this.dialog.remove();}
}
