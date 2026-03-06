var RSS='https://raw.githubusercontent.com/XiaomiFirmwareUpdater/miui-updates-tracker/master/rss/{c}.xml';
var DIR='https://api.github.com/repos/XiaomiFirmwareUpdater/miui-updates-tracker/contents/rss?per_page=1000';
var LS='xrf_v1';

var CODES=[],ALL_ROMS=[],SEL={},devName='',curCode='',devReady=false,dropIdx=-1,ttTimer;

function esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function ea(s){return String(s||'').replace(/'/g,"\\'").replace(/"/g,'&quot;');}
function toast(msg,cls){
  var el=document.getElementById('toast'),tx=document.getElementById('tTxt');
  clearTimeout(ttTimer);el.className='v '+(cls||'');tx.textContent=msg;
  if(cls==='ok')ttTimer=setTimeout(function(){el.className='';},2600);
}
function uniq(arr){var s={},o=[];arr.forEach(function(v){if(!s[v]){s[v]=1;o.push(v);}});return o;}
function scrollLast(){
  setTimeout(function(){
    var w=document.getElementById('wiz');
    if(w&&w.lastElementChild)w.lastElementChild.scrollIntoView({behavior:'smooth',block:'nearest'});
  },40);
}

/* localStorage */
function saveLS(){try{localStorage.setItem(LS,JSON.stringify({code:curCode,name:devName,roms:ALL_ROMS}));}catch(e){}}
function loadLS(){
  try{
    var raw=localStorage.getItem(LS);if(!raw)return;
    var s=JSON.parse(raw);
    if(s&&s.code&&s.roms&&s.roms.length){
      curCode=s.code;devName=s.name||s.code;ALL_ROMS=s.roms;SEL={};
      document.getElementById('sInput').value=s.code;
      document.getElementById('sClr').classList.add('v');
      showStep1(s.code);
      toast('Restored: '+s.code,'ok');
    }
  }catch(e){}
}

/* load codenames */
function loadDevices(){
  fetch(DIR).then(function(r){return r.json();}).then(function(j){
    CODES=j.filter(function(f){return f.name.slice(-4)==='.xml';})
           .map(function(f){return f.name.slice(0,-4);})
           .sort(function(a,b){return a.localeCompare(b);});
    devReady=true;
    document.getElementById('dLoad').style.display='none';
    if(document.getElementById('sdrop').classList.contains('v'))
      renderDrop(document.getElementById('sInput').value.trim());
  }).catch(function(){
    document.getElementById('dLoad').innerHTML='<span style="color:#b91c1c">Failed to load device list.</span>';
  });
}

/* dropdown */
function openDrop(){document.getElementById('sbox').classList.add('open');document.getElementById('sdrop').classList.add('v');renderDrop(document.getElementById('sInput').value.trim());}
function closeDrop(){document.getElementById('sbox').classList.remove('open');document.getElementById('sdrop').classList.remove('v');dropIdx=-1;}
document.addEventListener('click',function(e){if(!document.getElementById('sbox').parentNode.contains(e.target))closeDrop();});
function onInput(){
  var q=document.getElementById('sInput').value.trim();
  document.getElementById('sClr').classList.toggle('v',q.length>0);
  dropIdx=-1;renderDrop(q);
  if(!document.getElementById('sdrop').classList.contains('v'))openDrop();
}
function clearSearch(){
  document.getElementById('sInput').value='';
  document.getElementById('sClr').classList.remove('v');
  document.getElementById('sInput').focus();
  dropIdx=-1;renderDrop('');
  document.getElementById('wiz').innerHTML='';
  ALL_ROMS=[];SEL={};devName='';curCode='';
  try{localStorage.removeItem(LS);}catch(e){}
}
function onKey(e){
  if(!document.getElementById('sdrop').classList.contains('v'))return;
  if(e.key==='ArrowDown'){e.preventDefault();moveDrop(1);}
  else if(e.key==='ArrowUp'){e.preventDefault();moveDrop(-1);}
  else if(e.key==='Enter'){e.preventDefault();confirmDrop();}
  else if(e.key==='Escape'){closeDrop();}
}
function moveDrop(d){
  var items=document.querySelectorAll('.di');if(!items.length)return;
  if(dropIdx>=0)items[dropIdx].classList.remove('hi');
  dropIdx=Math.max(0,Math.min(items.length-1,dropIdx+d));
  items[dropIdx].classList.add('hi');items[dropIdx].scrollIntoView({block:'nearest'});
}
function confirmDrop(){var it=dropIdx>=0?document.querySelectorAll('.di')[dropIdx]:document.querySelector('.di');if(it)it.click();}
function renderDrop(q){
  var drop=document.getElementById('sdrop'),dl=document.getElementById('dLoad');
  if(!devReady){if(dl)dl.style.display='flex';return;}
  if(dl)dl.style.display='none';
  var ql=q.toLowerCase();
  var list=!q?CODES:CODES.filter(function(c){return c.toLowerCase().indexOf(ql)!==-1;});
  if(!list.length){drop.innerHTML='<div class="d-empty">No codename matches "'+esc(q)+'"</div>';return;}
  var groups={},letters=[],i,c,l;
  for(i=0;i<list.length;i++){c=list[i];l=c[0].toUpperCase();if(!groups[l]){groups[l]=[];letters.push(l);}groups[l].push(c);}
  letters.sort();
  var html='';
  for(i=0;i<letters.length;i++){
    l=letters[i];html+='<div><div class="dg-ltr">'+l+'</div><div class="dg-body">';
    groups[l].forEach(function(c){var ch=ql?hlMatch(c,ql):esc(c);html+='<div class="di" onclick="pickDevice(\''+ea(c)+'\')"><span class="di-code">'+ch+'</span></div>';});
    html+='</div></div>';
  }
  drop.innerHTML=html;dropIdx=-1;
}
function hlMatch(s,q){var i=s.toLowerCase().indexOf(q);if(i===-1)return esc(s);return esc(s.slice(0,i))+'<mark>'+esc(s.slice(i,i+q.length))+'</mark>'+esc(s.slice(i+q.length));}
function pickDevice(code){
  var r=code,i;for(i=0;i<CODES.length;i++){if(CODES[i].toLowerCase()===code.toLowerCase()){r=CODES[i];break;}}
  document.getElementById('sInput').value=r;document.getElementById('sClr').classList.add('v');closeDrop();startFetch(r);
}

/* parse */
function detOS(v){if(!v)return'MIUI';if(v.indexOf('OS')===0)return'HyperOS';if(v.indexOf('.DEV')!==-1)return'MIUI Beta';if(/^\d/.test(v))return'MIUI Weekly';return'MIUI';}
function detBranch(desc,ver){var t=desc.toLowerCase();if(t.indexOf('public beta')!==-1)return'beta';if(t.indexOf('new weekly')!==-1)return'weekly';if(t.indexOf('new stable')!==-1)return'stable';var o=detOS(ver);if(o==='MIUI Weekly')return'weekly';if(o==='MIUI Beta')return'beta';return'stable';}
function normUrl(u){return u?u.replace(/^http:\/\//i,'https://'):u;}
var REGS=[['China Telecom','China'],['China Unicom','China'],['China Mobile','China'],['China','China'],['Global','Global'],['EEA','Europe'],['Russia','Russia'],['Turkey','Turkey'],['India','India'],['Indonesia','Indonesia'],['Taiwan','Taiwan'],['Japan','Japan'],['Thailand','Thailand'],['Vietnam','Vietnam'],['Brazil','Brazil'],['Mexico','Mexico']];
function getReg(title){var m=title.match(/update for (.+)$/i),i,s,full;if(!m)return{device:'',region:'Global'};full=m[1].trim();for(i=0;i<REGS.length;i++){s=REGS[i][0];if(full.slice(-s.length)===s)return{device:full.slice(0,-s.length).trim().replace(/\s*\/\s*/g,' / '),region:REGS[i][1]};}return{device:full,region:'Global'};}
function parseItem(item){
  var title=((item.querySelector('title')||{}).textContent||'').trim();
  var desc=(item.querySelector('description')||{}).textContent||'';
  var pub=(((item.querySelector('pubDate')||{}).textContent)||'').trim();
  var le=item.getElementsByTagName('link');
  var link=normUrl(le[0]?le[0].textContent.trim():null);
  var d=document.createElement('div');d.innerHTML=desc;
  function ft(lbl){var bs=d.querySelectorAll('b'),i,b,val,n;for(i=0;i<bs.length;i++){b=bs[i];if(b.textContent.replace(':','').trim()===lbl){val='';n=b.nextSibling;while(n){if(n.nodeName==='B')break;if(n.nodeType===3)val+=n.textContent;n=n.nextSibling;}return val.replace(/^[\s:]+/,'').trim()||null;}}return null;}
  function lh(lbl){var bs=d.querySelectorAll('b'),i,b,n;for(i=0;i<bs.length;i++){b=bs[i];if(b.textContent.replace(':','').trim()===lbl){n=b.nextSibling;while(n){if(n.nodeName==='A')return normUrl(n.getAttribute('href'));if(n.nodeName==='B')break;n=n.nextSibling;}}}return null;}
  function gcl(){var bs=d.querySelectorAll('b'),i,b,lines,n;for(i=0;i<bs.length;i++){b=bs[i];if(b.textContent.replace(':','').trim()==='Changelog'){lines=[];n=b.nextSibling;while(n){if(n.nodeName==='B')break;if(n.nodeType===3&&n.textContent.trim())lines.push(n.textContent.trim());n=n.nextSibling;}return lines.join('\n').trim()||null;}}return null;}
  var vr=ft('Version'),ver=null,and=null;
  if(vr){var p=vr.split('|');ver=(p[0]||'').trim()||null;and=p[1]?'Android '+p[1].trim():null;}
  var ds='';if(pub){try{ds=new Date(pub).toLocaleDateString('en-GB',{year:'numeric',month:'short',day:'numeric'});}catch(e){}}
  var rg=getReg(title);
  return{title:title,link:link,version:ver,androidVer:and,size:ft('Size'),md5:ft('MD5'),date:ds,dateRaw:pub,changelog:gcl(),incrLink:lh('Incremental Update'),branch:detBranch(desc,ver),method:title.toLowerCase().indexOf('fastboot')!==-1?'fastboot':'recovery',osType:detOS(ver),region:rg.region,device:rg.device};
}

/* fetch */
function startFetch(code){
  SEL={};ALL_ROMS=[];devName='';curCode=code;
  document.getElementById('wiz').innerHTML=mkStep(1,'Device',null,false,null,
    '<div class="sp-row"><div class="sp-md"></div>Fetching data for <b style="color:var(--acc)">'+esc(code)+'</b>…</div>');
  toast('Loading '+code+'…','run');
  fetch(RSS.replace('{c}',code))
    .then(function(r){
      if(r.status===404){document.getElementById('wiz').innerHTML=errCard('"'+esc(code)+'" was not found.');toast('Not found','err');return null;}
      return r.text();
    })
    .then(function(text){
      if(!text)return;
      var doc=new DOMParser().parseFromString(text,'application/xml');
      var items=Array.prototype.slice.call(doc.querySelectorAll('item'));
      if(!items.length){document.getElementById('wiz').innerHTML=errCard('No ROMs available for this device.');toast('No ROMs','err');return;}
      var ct=((doc.querySelector('channel > title')||{}).textContent||'');
      devName=ct.replace(/\s*(MIUI|HyperOS) Updates Tracker.*/i,'').trim()||code.toUpperCase();
      ALL_ROMS=items.map(parseItem).sort(function(a,b){return new Date(b.dateRaw||0)-new Date(a.dateRaw||0);});
      saveLS();
      toast('✓ '+ALL_ROMS.length+' ROMs loaded','ok');
      showStep1(code);
    })
    .catch(function(e){document.getElementById('wiz').innerHTML=errCard('Connection error: '+esc(e.message));toast('Error','err');});
}
function errCard(msg){return '<div class="step"><div class="step-body" style="color:#b91c1c;font-size:13px">'+msg+'</div></div>';}

/* step builder: mkStep(num, title, chosen, done, editFn, bodyHtml) */
function mkStep(num,title,chosen,done,editFn,bodyHtml){
  var hdAttr=done&&editFn?' onclick="'+editFn+'"':'';
  var cls='step'+(done?' done':'')+(done&&editFn?' editable':'');
  return '<div class="'+cls+'">'
    +'<div class="step-hd"'+hdAttr+'>'
    +'<div class="step-n">'+num+'</div>'
    +'<div class="step-title">'+title+'</div>'
    +(chosen!=null?'<span class="step-sel">'+esc(chosen)+'</span>':'')
    +(done&&editFn?'<span class="step-edit">Edit</span>':'')
    +'</div>'
    +(bodyHtml?'<div class="step-body">'+bodyHtml+'</div>':'')
    +'</div>';
}

/* step 1 */
function showStep1(code){
  SEL={};
  var branches=uniq(ALL_ROMS.map(function(r){return r.branch;}));
  var order={stable:0,weekly:1,beta:2};branches.sort(function(a,b){return(order[a]||9)-(order[b]||9);});
  var brInfo={stable:{label:'Stable',icon:'●'},weekly:{label:'Weekly',icon:'◑'},beta:{label:'Beta',icon:'○'}};
  var grid=branches.map(function(b){
    var cnt=ALL_ROMS.filter(function(r){return r.branch===b;}).length;
    var info=brInfo[b]||{label:b,icon:'◌'};
    return '<div class="choice ch-'+b+'" onclick="selBranch(\''+b+'\')">'
      +'<div class="ch-icon" style="font-family:var(--mono);font-size:16px">'+info.icon+'</div>'
      +'<div class="ch-label">'+info.label+'</div>'
      +'<div class="ch-count">'+cnt+' ROMs</div></div>';
  }).join('');
  var col=branches.length===1?'col-auto':branches.length===2?'col-2':'col-3';
  var body='<div style="margin-bottom:12px"><div class="dev-name">'+esc(devName)+'</div><div class="dev-code">'+esc(code)+'</div></div>'
    +'<div class="step-divider"></div>'
    +'<div class="step-sub">Select build type</div>'
    +'<div class="choices '+col+'">'+grid+'</div>';
  document.getElementById('wiz').innerHTML=mkStep(1,'Device & Build Type',null,false,null,body);
}

/* step 2 */
function selBranch(branch){
  SEL.branch=branch;SEL.method=null;SEL.region=null;SEL.version=null;
  var brL={stable:'Stable',weekly:'Weekly',beta:'Beta'};
  var filtered=ALL_ROMS.filter(function(r){return r.branch===branch;});
  var methods=uniq(filtered.map(function(r){return r.method;}));
  var mI={recovery:{label:'Recovery',icon:'↺'},fastboot:{label:'Fastboot',icon:'⚡'}};
  var grid=methods.map(function(m){
    var cnt=filtered.filter(function(r){return r.method===m;}).length;
    var info=mI[m]||{label:m,icon:'◌'};
    return '<div class="choice ch-'+m+'" onclick="selMethod(\''+m+'\')">'
      +'<div class="ch-icon" style="font-family:var(--mono);font-size:15px">'+info.icon+'</div>'
      +'<div class="ch-label">'+info.label+'</div>'
      +'<div class="ch-count">'+cnt+' ROMs</div></div>';
  }).join('');
  var col=methods.length===1?'col-auto':'col-2';
  var wiz=document.getElementById('wiz');
  wiz.innerHTML=
    mkStep(1,'Device & Build Type',brL[branch],true,'showStep1(\''+ea(curCode)+'\')',
      '<div class="dev-name" style="font-size:14px">'+esc(devName)+'</div>')+
    mkStep(2,'Flash Method',null,false,null,
      '<div class="step-sub">Select flash method</div><div class="choices '+col+'">'+grid+'</div>');
  scrollLast();
}

/* step 3 */
function selMethod(method){
  SEL.method=method;SEL.region=null;SEL.version=null;
  var mL={recovery:'Recovery',fastboot:'Fastboot'};
  var filtered=ALL_ROMS.filter(function(r){return r.branch===SEL.branch&&r.method===method;});
  var regions=uniq(filtered.map(function(r){return r.region;})).sort();
  var flags={'China':'CN','Global':'GL','Europe':'EU','Russia':'RU','Turkey':'TR','India':'IN','Indonesia':'ID','Taiwan':'TW','Japan':'JP','Thailand':'TH','Vietnam':'VN','Brazil':'BR','Mexico':'MX'};
  var grid=regions.map(function(rg){
    var cnt=filtered.filter(function(r){return r.region===rg;}).length;
    return '<div class="choice" onclick="selRegion(\''+ea(rg)+'\')">'
      +'<div class="ch-icon" style="font-family:var(--mono);font-size:12px;font-weight:700;letter-spacing:.5px;color:var(--fg2)">'+(flags[rg]||'--')+'</div>'
      +'<div class="ch-label" style="font-size:12px">'+esc(rg)+'</div>'
      +'<div class="ch-count">'+cnt+'</div></div>';
  }).join('');
  var col=regions.length<=2?'col-2':'col-auto';
  var wiz=document.getElementById('wiz');
  wiz.innerHTML=
    wiz.children[0].outerHTML+
    mkStep(2,'Flash Method',mL[method],true,'selBranch(\''+ea(SEL.branch)+'\')',null)+
    mkStep(3,'Region',null,false,null,
      '<div class="step-sub">Select region</div><div class="choices '+col+'">'+grid+'</div>');
  scrollLast();
}

/* step 4 */
function selRegion(region){
  SEL.region=region;SEL.version=null;
  var filtered=ALL_ROMS.filter(function(r){return r.branch===SEL.branch&&r.method===SEL.method&&r.region===region;});
  var items=filtered.map(function(rom,idx){
    var ih=rom.osType.indexOf('HyperOS')===0;
    var ob='<span class="badge '+(ih?'b-hyperos':'b-miui')+'">'+esc(rom.osType)+'</span>';
    var isFirst=idx===0;
    return '<div class="ver-item'+(isFirst?' latest':'')+'" onclick="selVersion('+idx+')">'
      +'<div class="vi-left"><span class="vi-code">'+esc(rom.version||'Unknown')+'</span>'+(isFirst?'<span class="vi-latest">Latest</span>':'')+'</div>'
      +'<div class="vi-meta">'+ob+(rom.date?'<div class="vi-date">'+esc(rom.date)+'</div>':'')+(rom.androidVer?'<div class="vi-android">'+esc(rom.androidVer)+'</div>':'')+'</div>'
      +'</div>';
  }).join('');
  var wiz=document.getElementById('wiz');
  wiz.innerHTML=
    wiz.children[0].outerHTML+
    wiz.children[1].outerHTML+
    mkStep(3,'Region',region,true,'selMethod(\''+ea(SEL.method)+'\')',null)+
    mkStep(4,'Version',null,false,null,
      '<div class="step-sub">Select version</div><div class="ver-list">'+items+'</div>');
  window._filtRoms=filtered;
  scrollLast();
}

/* step 5 */
function selVersion(idx){
  var rom=window._filtRoms[idx];if(!rom)return;
  SEL.version=rom.version;
  var ih=rom.osType.indexOf('HyperOS')===0;
  var ob='<span class="badge '+(ih?'b-hyperos':'b-miui')+'">'+esc(rom.osType)+'</span>';
  var bb='<span class="badge b-'+rom.branch+'">'+rom.branch+'</span>';
  var mb='<span class="badge b-'+rom.method+'">'+rom.method+'</span>';
  var grid='';
  if(rom.region)     grid+=mkRC('Region',   rom.region,   false);
  if(rom.androidVer) grid+=mkRC('Android',  rom.androidVer,false);
  if(rom.size)       grid+=mkRC('Size',      rom.size,     false);
  if(rom.date)       grid+=mkRC('Released',  rom.date,     false);
  if(rom.md5)        grid+=mkRC('MD5',        rom.md5,     true);
  var cl='';
  if(rom.changelog){
    var lines=rom.changelog.split('\n').map(function(l){return esc(l);}).join('<br>');
    cl='<div class="clog" id="clg"><button class="cl-tog" type="button" onclick="togCl()"><span class="cl-lbl">Changelog</span><span class="cl-chev">▾</span></button><div class="cl-body">'+lines+'</div></div>';
  }
  var dl='<div class="dl-list">';
  if(rom.link)     dl+=mkDR(rom.link,    'b-'+rom.method,rom.method==='fastboot'?'Fastboot':'Recovery');
  if(rom.incrLink) dl+=mkDR(rom.incrLink,'b-recovery',   'Incremental');
  dl+='</div>';
  var body='<div class="rom-detail">'
    +'<div class="rom-header"><div class="rom-ver">'+esc(rom.version||'Unknown')+'</div><div class="rom-badges">'+ob+bb+mb+'</div></div>'
    +'<div class="rom-grid">'+grid+'</div>'+cl+dl+'</div>';
  var again='<button class="btn-again" onclick="clearSearch();setTimeout(function(){document.getElementById(\'sInput\').focus();},50)">Search another device</button>';
  var wiz=document.getElementById('wiz');
  wiz.innerHTML=
    wiz.children[0].outerHTML+
    wiz.children[1].outerHTML+
    wiz.children[2].outerHTML+
    mkStep(4,'Version',esc(rom.version||'Unknown'),true,'selRegion(\''+ea(SEL.region)+'\')',null)+
    mkStep(5,'Download',null,false,null,body)+
    again;
  scrollLast();
}

function mkRC(lbl,val,full){return'<div class="rom-cell'+(full?' full':'')+'"><span class="rc-lbl">'+lbl+'</span><span class="rc-val'+(full?' muted':'')+'">'+esc(val)+'</span></div>';}
function mkDR(url,bc,lbl){var fn=url.split('/').pop()||url;return'<div class="dl-row"><span class="dl-badge '+bc+'">'+esc(lbl)+'</span><span class="dl-name" title="'+esc(url)+'">'+esc(fn)+'</span><div class="dl-acts"><button class="btn-copy" type="button" onclick="doCopy(this,\''+ea(url)+'\')">Copy</button><a class="btn-dl" href="'+ea(url)+'" target="_blank" rel="noopener">Download</a></div></div>';}
function togCl(){var e=document.getElementById('clg');if(e)e.classList.toggle('open');}
function doCopy(btn,url){
  function ok(){btn.textContent='Copied';btn.classList.add('ok');setTimeout(function(){btn.textContent='Copy';btn.classList.remove('ok');},2000);}
  if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(url).then(ok).catch(function(){fb(btn,url);});}else fb(btn,url);
}
function fb(btn,url){var ta=document.createElement('textarea');ta.value=url;ta.style.cssText='position:fixed;top:0;left:0;opacity:0;';document.body.appendChild(ta);ta.focus();ta.select();try{document.execCommand('copy');}catch(e){}document.body.removeChild(ta);btn.textContent='Copied';btn.classList.add('ok');setTimeout(function(){btn.textContent='Copy';btn.classList.remove('ok');},2000);}

loadDevices();
loadLS();