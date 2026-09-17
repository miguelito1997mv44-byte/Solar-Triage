
const STORE='vdzSolarTriageCasesV2';
const SETTINGS='vdzSolarTriageSettingsV1';

const Q={
  app:{t:"What does the customer see in the app or monitoring portal?",h:"Use their exact wording if possible.",o:[["offline","Offline / not communicating"],["zero","Zero or very low production"],["error","Specific fault or error message"],["normal","Looks normal, but they were told there is a problem"],["unknown","They do not know / cannot access the app"]]},
  router:{t:"Did they recently change internet service, router, Wi-Fi name, or password?",h:"If yes, communication becomes a stronger first suspect.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]},
  commlight:{t:"If there is a blue communication light, is it on?",h:"Only ask them to look from the outside.",o:[["yes","Yes"],["no","No"],["na","No blue light / not applicable"],["unknown","They cannot tell"]]},
  prodlight:{t:"Is there a green production light showing?",h:"This can help separate production from monitoring/communication.",o:[["yes","Yes"],["no","No"],["unknown","They cannot tell"]]},
  outage:{t:"Was there a recent power outage or electrical work at the home?",h:"If timing lines up, verify system status after the outage first.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]},
  red:{t:"Is there a red light or visible fault indicator on the inverter or gateway?",h:"A visible fault raises the chance of an actual equipment/system issue.",o:[["yes","Yes"],["no","No"],["unknown","They cannot tell"]]},
  faulttext:{t:"Can the customer read you the exact fault or error message?",h:"Write it down exactly. Do not interpret it yet.",o:[["yes","Yes — I have the exact message"],["no","No"],["unknown","They cannot tell"]]},
  scope:{t:"Does the problem appear to affect the whole system or only one inverter / panel / device?",h:"This helps separate localized faults from whole-system issues.",o:[["whole","Whole system"],["one","One inverter / panel / device"],["unknown","Not sure"]]},
  recentwork:{t:"Has anyone worked on the solar or electrical system recently?",h:"Recent service can be relevant to settings, wiring, disconnected equipment, or communications.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]},
  one_device:{t:"Do they know which inverter, microinverter, optimizer, or panel is affected?",h:"If they know the device, you can prepare for a targeted onsite check.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]},
  whole_zero:{t:"Is the whole system showing zero production?",h:"This helps separate total production loss from a monitoring-only problem.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]},
  recentstart:{t:"Did the problem start right after the outage, router change, or recent service work?",h:"Timing can point toward the first area to verify onsite.",o:[["yes","Yes"],["no","No"],["unknown","Not sure"]]}
};

const RESULT={
  R_comm_strong:{cat:"Communication / network",base:.85,tag:"Strong communication/network lead",cls:"good",title:"Start with network / monitoring communication",why:"Offline reporting + recent network change + production indication strongly favors a communication path.",checks:["Confirm actual inverter production.","Identify communication method: Wi-Fi, Ethernet, cellular, or gateway.","Check monitoring/server connection.","Verify network credentials or local communication before suspecting inverter hardware."],tools:["Phone/tablet with manufacturer app","Network credentials if available","Basic electrical test gear for onsite verification"]},
  R_comm:{cat:"Communication / network",base:.72,tag:"Likely communication issue",cls:"good",title:"Verify communication before suspecting inverter failure",why:"The customer reports an offline/not-communicating condition while production may still be present.",checks:["Confirm production onsite.","Check communication indicators and method.","Check gateway/router connectivity if applicable.","Document current state before changing settings."],tools:["Manufacturer app","Phone/tablet","Basic electrical test gear"]},
  R_fault:{cat:"Equipment / fault code",base:.76,tag:"Possible equipment/system fault",cls:"bad",title:"Start with the exact fault code and manufacturer procedure",why:"A visible fault/error makes an equipment or system fault more plausible.",checks:["Record exact fault/error message.","Record model and serial number.","Verify whether production is affected.","Follow manufacturer troubleshooting before RMA."],tools:["Manufacturer app/support access","Multimeter/clamp meter as appropriate","PPE","Camera/phone"]},
  R_localized:{cat:"Localized device",base:.72,tag:"Possible localized device issue",cls:"warn",title:"Start with the affected inverter / microinverter / optimizer / panel",why:"The issue appears isolated rather than system-wide.",checks:["Identify exact affected device.","Compare status to the rest of the system.","Record device serial and any fault.","Determine whether issue is communication, wiring, production, or hardware."],tools:["Manufacturer app/layout access","Basic electrical test gear","Camera/phone"]},
  R_systemwide:{cat:"System-wide production",base:.78,tag:"Possible system-wide production issue",cls:"bad",title:"Start with whole-system power and inverter status",why:"The customer reports loss of production across the whole system.",checks:["Inspect indicators, disconnects, and breakers.","Record any visible fault codes.","Verify system/utility status using approved onsite procedures.","Do not conclude inverter failure until tested."],tools:["Multimeter/clamp meter as appropriate","PPE","Manufacturer app/support access"]},
  R_recentwork:{cat:"Post-service / configuration",base:.66,tag:"Possible post-service/configuration issue",cls:"warn",title:"Start with what changed during recent work",why:"The problem followed recent work on the solar or electrical system.",checks:["Ask what work was done and by whom.","Inspect recently serviced areas.","Check settings/communications/wiring changes.","Document condition before correcting anything."],tools:["Work-order history if available","Manufacturer app","Camera/phone","Basic electrical test gear"]},
  R_general:{cat:"Undetermined",base:.45,tag:"Needs onsite diagnosis",cls:"warn",title:"No single cause stands out yet",why:"Phone answers do not strongly point to one fault family.",checks:["Confirm production and communication separately.","Record LEDs, fault codes, model, and serial.","Identify communication method.","Narrow failed subsystem before manufacturer call/RMA."],tools:["Full normal diagnostic kit","Manufacturer app/support access","Camera/phone"]}
};

const actualCats=["Communication / network","Equipment / fault code","Localized device","System-wide production","Post-service / configuration","Breaker / disconnect / AC-side","DC string / PV wiring","Optimizer issue","Microinverter issue","Gateway / monitoring hardware","CT / metering / configuration","Customer network / router","No fault found / normal operation","Other"];

let ans={},route=[],cur=null,lastResult=null,deferredInstall=null;

document.addEventListener('DOMContentLoaded',()=>{
  registerSW();
  initTabs();
  bindButtons();
  loadSettings();
  updateOnlineStatus();
  window.addEventListener('online',updateOnlineStatus);
  window.addEventListener('offline',updateOnlineStatus);
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferredInstall=e;
    document.getElementById('installBtn').classList.remove('hidden');
  });
});

function initTabs(){
  document.querySelectorAll('.tab').forEach(btn=>btn.addEventListener('click',()=>showTab(btn.dataset.tab,btn)));
}
function showTab(id,el){
  document.querySelectorAll('main section').forEach(s=>s.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.querySelectorAll('.tab').forEach(b=>b.classList.remove('active'));
  if(el)el.classList.add('active');
  if(id==='calls')renderCalls();
  if(id==='calibration')renderCalibration();
}
function bindButtons(){
  document.getElementById('startBtn').onclick=begin;
  document.getElementById('backBtn').onclick=back;
  document.getElementById('restartBtn').onclick=resetTriage;
  document.getElementById('newBtn').onclick=resetTriage;
  document.getElementById('saveBtn').onclick=saveCase;
  document.getElementById('copyBtn').onclick=copySummary;
  document.getElementById('saveSettingsBtn').onclick=saveSettings;
  document.getElementById('pushAllBtn').onclick=pushAll;
  document.getElementById('pullCloudBtn').onclick=pullCloud;
  document.getElementById('syncCallsBtn').onclick=pullCloud;
  document.getElementById('exportCsvBtn').onclick=exportCSV;
  document.getElementById('exportJsonBtn').onclick=exportJSON;
  document.getElementById('importFile').onchange=importJSON;
  document.getElementById('installBtn').onclick=installApp;
}
function updateOnlineStatus(){
  const e=document.getElementById('onlineStatus');
  e.textContent=navigator.onLine?'Online':'Offline';
  e.className='status-pill '+(navigator.onLine?'good':'warn');
}
function registerSW(){
  if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
}
function localCases(){try{return JSON.parse(localStorage.getItem(STORE)||'[]')}catch{return []}}
function setLocalCases(v){localStorage.setItem(STORE,JSON.stringify(v))}
function settings(){try{return JSON.parse(localStorage.getItem(SETTINGS)||'{}')}catch{return {}}}
function loadSettings(){document.getElementById('endpoint').value=settings().endpoint||''}
function saveSettings(){
  const endpoint=document.getElementById('endpoint').value.trim();
  localStorage.setItem(SETTINGS,JSON.stringify({endpoint}));
  alert('Settings saved.');
}
function begin(){
  ans={};route=[];cur='app';lastResult=null;
  document.getElementById('startPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('quizPanel').classList.remove('hidden');
  renderQ();
}
function renderQ(){
  const q=Q[cur];
  document.getElementById('questionText').textContent=q.t;
  document.getElementById('questionHelp').textContent=q.h;
  document.getElementById('pathLabel').textContent='Smart path: '+pathName();
  document.getElementById('stepLabel').textContent='Question '+(route.length+1);
  document.getElementById('progressBar').style.width=Math.min(95,(route.length/6)*100)+'%';
  const list=document.getElementById('choiceList');list.innerHTML='';
  q.o.forEach(([v,l])=>{
    const b=document.createElement('button'); b.className='choice'; b.textContent=l;
    b.onclick=()=>answer(cur,v,l); list.appendChild(b);
  });
}
function pathName(){
  if(ans.app?.v==='offline')return'Communication / monitoring';
  if(ans.app?.v==='zero')return'Production';
  if(ans.app?.v==='error')return'Fault code / equipment';
  if(ans.scope?.v==='one')return'Localized device';
  if(ans.scope?.v==='whole')return'Whole-system';
  return'General triage';
}
function next(id,v){
  if(id==='app'){if(v==='offline')return'router';if(v==='zero')return'outage';if(v==='error')return'red';return'scope'}
  if(id==='router')return v==='yes'?'commlight':'prodlight';
  if(id==='commlight')return'prodlight';
  if(id==='prodlight'){
    if(ans.app?.v==='offline'&&ans.router?.v==='yes'&&v==='yes')return'R_comm_strong';
    if(ans.app?.v==='offline'&&v==='yes')return'R_comm';
    if(ans.app?.v==='offline'&&v==='no')return'red';
    return'scope';
  }
  if(id==='outage')return v==='yes'?'recentstart':'red';
  if(id==='recentstart')return'red';
  if(id==='red')return(v==='yes'||ans.app?.v==='error')?'faulttext':'scope';
  if(id==='faulttext')return'R_fault';
  if(id==='scope'){if(v==='one')return'one_device';if(v==='whole')return'whole_zero';return'recentwork'}
  if(id==='one_device')return'R_localized';
  if(id==='whole_zero')return v==='yes'?'R_systemwide':'recentwork';
  if(id==='recentwork')return v==='yes'?'R_recentwork':'R_general';
  return'R_general';
}
function answer(id,v,l){
  ans[id]={v,l}; route.push(id);
  const n=next(id,v);
  if(n.startsWith('R_'))finish(n); else{cur=n;renderQ()}
}
function back(){
  if(!route.length){resetTriage();return}
  const id=route.pop(); delete ans[id]; cur=id; renderQ();
}
function resetTriage(){
  ans={};route=[];cur=null;lastResult=null;
  document.getElementById('quizPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.add('hidden');
  document.getElementById('startPanel').classList.remove('hidden');
}
function histStats(cat){
  const done=localCases().filter(x=>x.actualCategory);
  const same=done.filter(x=>x.predictedCategory===cat);
  if(!same.length)return{n:0,acc:null};
  const correct=same.filter(x=>x.actualCategory===x.predictedCategory).length;
  return{n:same.length,acc:correct/same.length};
}
function confidence(cat,base){
  const h=histStats(cat);
  if(h.n<3)return{value:base,label:base>=.8?'High':base>=.65?'Moderate':'Low',note:'Rule-based confidence; not enough completed local cases yet.'};
  const blended=base*.4+h.acc*.6;
  return{value:blended,label:blended>=.8?'High':blended>=.6?'Moderate':'Low',note:`Adjusted using ${h.n} completed calls in this predicted category (${Math.round(h.acc*100)}% historical match).`};
}
function finish(code){
  document.getElementById('quizPanel').classList.add('hidden');
  document.getElementById('resultPanel').classList.remove('hidden');
  const r=RESULT[code]||RESULT.R_general, conf=confidence(r.cat,r.base);
  lastResult={
    id:'SC-'+Date.now(),updatedAt:new Date().toISOString(),created:new Date().toISOString(),
    provider:val('provider')||'NovaVolt Solutions',customer:val('customer')||'Customer',city:val('city'),brand:val('brand')||'Unknown',
    kw:val('kw'),reported:val('reported'),answers:JSON.parse(JSON.stringify(ans)),
    predictedCategory:r.cat,predictedTag:r.tag,confidence:conf.value,confidenceLabel:conf.label,
    why:r.why,checks:r.checks,tools:r.tools
  };
  document.getElementById('resultCard').innerHTML=`
    <span class="tag ${r.cls}">${esc(r.tag)}</span>
    <h2>${esc(r.title)}</h2>
    <p><strong>Work provider:</strong> ${esc(lastResult.provider||'NovaVolt Solutions')}<br><strong>Customer:</strong> ${esc(lastResult.customer)}<br>
    <strong>System:</strong> ${esc(lastResult.brand)}${lastResult.kw?' — '+esc(lastResult.kw)+' kW':''}<br>
    <strong>Reported:</strong> ${esc(lastResult.reported||'Not entered')}</p>
    <p><strong>Confidence:</strong> ${esc(conf.label)} (${Math.round(conf.value*100)}%)<br>
    <span class="muted">${esc(conf.note)}</span></p>
    <p><strong>Why:</strong><br>${esc(r.why)}</p>
    <p><strong>Bring / prepare:</strong></p><ul>${r.tools.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>
    <p><strong>Verify onsite:</strong></p><ul>${r.checks.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`;
}
async function saveCase(){
  if(!lastResult)return;
  const all=localCases(); if(!all.some(x=>x.id===lastResult.id))all.unshift(lastResult); setLocalCases(all);
  const ok=await pushRecord(lastResult);
  alert(ok?'Saved locally and sent to cloud.':'Saved locally. Cloud sync is not configured or unavailable.');
}
function copySummary(){
  if(!lastResult)return;
  const s=`Work provider: ${lastResult.provider||'NovaVolt Solutions'}\nCustomer: ${lastResult.customer}
System: ${lastResult.brand}${lastResult.kw?' — '+lastResult.kw+' kW':''}
Reported issue: ${lastResult.reported}
Predicted category: ${lastResult.predictedCategory}
Confidence: ${lastResult.confidenceLabel} (${Math.round(lastResult.confidence*100)}%)

Why:
${lastResult.why}

Verify onsite:
- ${lastResult.checks.join('\n- ')}`;
  navigator.clipboard.writeText(s).then(()=>alert('Summary copied.')).catch(()=>prompt('Copy this summary:',s));
}
function renderCalls(){
  const list=document.getElementById('callList'),all=localCases(); list.innerHTML='';
  if(!all.length){list.innerHTML='<p class="muted">No saved calls yet.</p>';return}
  all.forEach(c=>{
    const div=document.createElement('div');div.className='case-card';
    const matched=c.actualCategory?c.actualCategory===c.predictedCategory:null;
    div.innerHTML=`
      <div class="case-title">${esc(c.customer)} — ${esc(c.brand)}${c.kw?' '+esc(c.kw)+' kW':''}</div><div class="case-meta">Provider: ${esc(c.provider||'NovaVolt Solutions')}</div>
      <div class="case-meta">${esc(c.city||'')}<br>Reported: ${esc(c.reported||'')}<br>Predicted: ${esc(c.predictedCategory)} (${Math.round((c.confidence||0)*100)}%)</div>
      <div style="margin-top:8px">${c.actualCategory?`<span class="tag ${matched?'good':'warn'}">${matched?'Prediction matched':'Prediction differed'}</span>`:'<span class="tag info">Awaiting onsite outcome</span>'}</div>
      <div class="button-row">
        <button class="primary" onclick="editOutcome('${c.id}')">${c.actualCategory?'Edit Outcome':'Record Field Outcome'}</button>
        <button class="secondary" onclick="copyCase('${c.id}')">Copy</button>
      </div>
      <div id="edit-${c.id}"></div>`;
    list.appendChild(div);
  });
}
function editOutcome(id){
  const c=localCases().find(x=>x.id===id); if(!c)return;
  document.getElementById('edit-'+id).innerHTML=`
    <hr>
    <div class="grid two">
      <div class="field"><label>Actual diagnosis category</label><select id="ac-${id}">${actualCats.map(x=>`<option ${c.actualCategory===x?'selected':''}>${esc(x)}</option>`).join('')}</select></div>
      <div class="field"><label>Manufacturer case / RMA #</label><input id="rma-${id}" value="${attr(c.rma||'')}" /></div>
    </div>
    <div class="field"><label>Actual onsite diagnosis</label><textarea id="diag-${id}">${esc(c.actualDiagnosis||'')}</textarea></div>
    <div class="field"><label>Repair / action taken</label><textarea id="fix-${id}">${esc(c.repair||'')}</textarea></div>
    <div class="field"><label>Return visit needed?</label><select id="ret-${id}"><option ${c.returnVisit==='No'?'selected':''}>No</option><option ${c.returnVisit==='Yes'?'selected':''}>Yes</option><option ${c.returnVisit==='Pending'?'selected':''}>Pending</option></select></div>
    <button class="primary" onclick="saveOutcome('${id}')">Save Field Outcome</button>`;
}
async function saveOutcome(id){
  const all=localCases(),i=all.findIndex(x=>x.id===id);if(i<0)return;
  all[i].actualCategory=val('ac-'+id);all[i].actualDiagnosis=val('diag-'+id);all[i].repair=val('fix-'+id);
  all[i].rma=val('rma-'+id);all[i].returnVisit=val('ret-'+id);all[i].updatedAt=new Date().toISOString();
  setLocalCases(all); await pushRecord(all[i]); renderCalls();
}
function copyCase(id){
  const c=localCases().find(x=>x.id===id); if(!c)return;
  const s=`Provider: ${c.provider||'NovaVolt Solutions'}\n${c.customer} | ${c.brand} ${c.kw?c.kw+' kW':''}
Reported: ${c.reported}
Predicted: ${c.predictedCategory}
Actual: ${c.actualCategory||'Pending'}
Diagnosis: ${c.actualDiagnosis||'Pending'}
Repair: ${c.repair||'Pending'}
RMA/Case: ${c.rma||'N/A'}`;
  navigator.clipboard.writeText(s).then(()=>alert('Case copied.')).catch(()=>prompt('Copy:',s));
}
function renderCalibration(){
  const all=localCases(),done=all.filter(x=>x.actualCategory),pending=all.length-done.length;
  const correct=done.filter(x=>x.actualCategory===x.predictedCategory).length;
  document.getElementById('metricCompleted').textContent=done.length;
  document.getElementById('metricAccuracy').textContent=done.length?Math.round(correct/done.length*100)+'%':'0%';
  document.getElementById('metricPending').textContent=pending;
  const cats=[...new Set(all.map(x=>x.predictedCategory))].filter(Boolean);
  document.getElementById('calibrationTable').innerHTML=cats.length?`
    <table><thead><tr><th>Predicted category</th><th>Predictions</th><th>Completed</th><th>Historical match</th></tr></thead>
    <tbody>${cats.map(cat=>{
      const p=all.filter(x=>x.predictedCategory===cat),d=p.filter(x=>x.actualCategory),m=d.filter(x=>x.actualCategory===x.predictedCategory).length;
      return`<tr><td>${esc(cat)}</td><td>${p.length}</td><td>${d.length}</td><td>${d.length?Math.round(m/d.length*100)+'%':'—'}</td></tr>`;
    }).join('')}</tbody></table>`:'<p class="muted">No calibration data yet.</p>';
}
async function pushRecord(record){
  const endpoint=settings().endpoint;
  if(!endpoint||!navigator.onLine)return false;
  try{
    await fetch(endpoint,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({action:'upsert',record})});
    return true;
  }catch{return false}
}
async function pushAll(){
  const all=localCases(); if(!all.length){alert('No local records to push.');return}
  let n=0; for(const c of all) if(await pushRecord(c))n++;
  alert(`Cloud push attempted for ${n} record(s).`);
}
function jsonp(url){
  return new Promise((resolve,reject)=>{
    const cb='cb_'+Date.now()+'_'+Math.floor(Math.random()*1e6);
    window[cb]=(data)=>{resolve(data);cleanup()};
    const s=document.createElement('script');
    const cleanup=()=>{delete window[cb];s.remove()};
    s.onerror=()=>{cleanup();reject(new Error('sync failed'))};
    s.src=url+(url.includes('?')?'&':'?')+'action=list&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.body.appendChild(s);
    setTimeout(()=>{if(window[cb]){cleanup();reject(new Error('timeout'))}},12000);
  });
}
async function pullCloud(){
  const endpoint=settings().endpoint;
  if(!endpoint){alert('Add your Google Apps Script Web App URL in Settings first.');return}
  try{
    const data=await jsonp(endpoint);
    const cloud=Array.isArray(data.records)?data.records:[];
    const map=new Map(localCases().map(x=>[x.id,x]));
    cloud.forEach(c=>{
      const local=map.get(c.id);
      if(!local||String(c.updatedAt||'')>String(local.updatedAt||''))map.set(c.id,c);
    });
    setLocalCases([...map.values()].sort((a,b)=>String(b.created).localeCompare(String(a.created))));
    renderCalls();renderCalibration();
    alert(`Pulled ${cloud.length} cloud record(s).`);
  }catch{alert('Could not read cloud records. Check the Web App URL and deployment access settings.')}
}
function exportCSV(){
  const all=localCases(),headers=["ID","Date","Work Provider","Customer","City","Brand","kW","Reported Issue","Predicted Category","Confidence","Actual Category","Actual Diagnosis","Repair","RMA Case","Return Visit"];
  const rows=all.map(c=>[c.id,c.created,c.provider||'NovaVolt Solutions',c.customer,c.city,c.brand,c.kw,c.reported,c.predictedCategory,Math.round((c.confidence||0)*100)+'%',c.actualCategory||'',c.actualDiagnosis||'',c.repair||'',c.rma||'',c.returnVisit||'']);
  download('solar_service_triage_history.csv',[headers,...rows].map(r=>r.map(csv).join(',')).join('\n'),'text/csv');
}
function exportJSON(){download('solar_service_triage_backup.json',JSON.stringify(localCases(),null,2),'application/json')}
function importJSON(e){
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{const v=JSON.parse(r.result);if(!Array.isArray(v))throw Error();setLocalCases(v);alert('Backup imported.')}catch{alert('Invalid backup file.')}};
  r.readAsText(f);
}
function download(name,data,type){const b=new Blob([data],{type}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
function csv(v){v=String(v??'');return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v}
function val(id){return(document.getElementById(id)?.value||'').trim()}
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
function attr(s){return esc(s)}
async function installApp(){if(!deferredInstall)return;deferredInstall.prompt();await deferredInstall.userChoice;deferredInstall=null;document.getElementById('installBtn').classList.add('hidden')}
