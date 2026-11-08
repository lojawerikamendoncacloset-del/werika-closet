
/* Werika Mendonça Closet — catálogo + painel
   Dados no Supabase (tabelas produtos e config, bucket fotos). Configuração em js/config.js */
const sb=supabase.createClient(CFG.supabaseUrl,CFG.supabaseKey);
const CATS=['Novidades','Vestidos','Blusas','Calças','Saias','Conjuntos'];
const SIZES=['PP','P','M','G','GG','Único'];
const DEF_TXT={ann:'Peça seu condicional · Enviamos para todo o Brasil',pa:'',wa:'5564992071978'};
let DB={prods:[],txt:{...DEF_TXT},home:null};
const img=s=>s||'';
const fromRow=r=>({id:r.id,n:r.nome,brand:r.marca||'',cat:r.categoria||'Vestidos',p:r.preco?Number(r.preco):null,d:r.descricao||'',sizes:r.tamanhos||[],imgs:r.fotos||[],out:!!r.esgotado});
const toRow=p=>({nome:p.n,marca:p.brand,categoria:p.cat,preco:p.p,descricao:p.d,tamanhos:p.sizes,fotos:p.imgs,esgotado:p.out});
async function loadAll(){
 const [pr,cf]=await Promise.all([sb.from('produtos').select('*').order('criado_em',{ascending:false}),sb.from('config').select('dados').eq('id',1).maybeSingle()]);
 if(pr.error)throw pr.error;
 DB.prods=pr.data.map(fromRow);
 const d=(cf.data&&cf.data.dados)||{};
 DB.txt={...DEF_TXT,...(d.txt||{})};DB.home=Array.isArray(d.home)&&d.home.length?d.home:defHome();}
async function saveCfg(){const {error}=await sb.from('config').upsert({id:1,dados:{txt:DB.txt,home:DB.home},atualizado_em:new Date().toISOString()});if(error)throw error;}
async function upload(dataUrl){const blob=await (await fetch(dataUrl)).blob();
 const path=`${new Date().toISOString().slice(0,10)}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.jpg`;
 const {error}=await sb.storage.from('fotos').upload(path,blob,{contentType:'image/jpeg',cacheControl:'31536000'});if(error)throw error;
 return sb.storage.from('fotos').getPublicUrl(path).data.publicUrl;}
async function uploadAll(list){const out=[];for(const s of list)out.push(s.startsWith('data:')?await upload(s):s);return out;}
function removeFiles(urls){const paths=urls.filter(u=>u&&u.includes('/fotos/')).map(u=>decodeURIComponent(u.split('/fotos/')[1]));if(paths.length)sb.storage.from('fotos').remove(paths).catch(()=>{});}
async function busy(btn,fn,label='Salvando…'){if(btn&&btn.disabled)return;const t=btn&&btn.textContent;if(btn){btn.disabled=true;btn.textContent=label;}
 try{await fn();}catch(e){console.error(e);toast(navigator.onLine?'Não deu para salvar. Tente de novo.':'Sem internet. Confira a conexão e tente de novo.');}
 finally{if(btn){btn.disabled=false;btn.textContent=t;}}}
const byId=id=>DB.prods.find(p=>p.id===id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
let cat='Novidades',brand=null,cur=null,size=null,bag=[],mode='c',logged=false,editing=null,ePhotos=[],eSizes=[],ready=false;
const $=id=>document.getElementById(id);
const brl=v=>v.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const price=v=>v?brl(v):'Consulte';
const waLink=t=>'https://wa.me/'+DB.txt.wa+'?text='+encodeURIComponent(t);
const fmtTel=n=>{const d=n.replace(/^55/,'');return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:n;};

function setTab(t){document.querySelectorAll('.tab[data-t]').forEach(x=>x.classList.toggle('on',x.dataset.t===t));}
function tabHome(){$('menu').hidden=true;$('search').hidden=true;go('home');setTab('home');}
function tabCats(){go('home');setTab('cats');if($('menu').hidden)toggleMenu();}
function tabSearch(){go('home');setTab('search');if($('search').hidden)toggleSearch();}
function go(v){if((v==='home'||v==='bag')&&location.hash.startsWith('#peca-'))history.replaceState(null,'',location.pathname);setTab(v==='bag'?'bag':v==='home'?'home':'');document.querySelectorAll('.view').forEach(s=>s.classList.toggle('on',s.id===v));
 document.querySelector('.tabs').hidden=['login','admin','edit','bedit'].includes(v);
 if(v==='bag')renderBag();if(v==='home')renderHome();if(v==='admin')renderAdmin();window.scrollTo(0,0);}
function toast(t){const e=$('toast');e.textContent=t;e.classList.add('show');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('show'),1900);}

function renderChips(){if(!$('chips'))return;$('chips').innerHTML=CATS.map(c=>`<button class="chip ${c===cat&&!brand?'on':''}" onclick="pickCat('${c}')">${c}</button>`).join('');}
function pickCat(c){$('menu').hidden=true;$('q').value='';cat=c;brand=null;document.querySelectorAll('.brand').forEach(b=>b.classList.remove('sel'));renderChips();renderGrid();}
function pickBrand(el){const b=el.dataset.brand;brand=brand===b?null:b;document.querySelectorAll('.brand').forEach(x=>x.classList.toggle('sel',x.dataset.brand===brand));renderChips();renderGrid();$('secT').scrollIntoView({behavior:'smooth',block:'start'});}
function renderGrid(){
 let list=DB.prods.filter(p=>p.imgs.length);
 const q=($('q').value||'').trim().toLowerCase();
 if(q){$('secT').textContent='Busca';list=list.filter(p=>(p.n+' '+p.cat+' '+p.brand).toLowerCase().includes(q));}
 else if(brand){$('secT').textContent=brand;list=list.filter(p=>p.brand===brand);}
 else{$('secT').textContent=cat;if(cat!=='Novidades')list=list.filter(p=>p.cat===cat);}
 list.sort((a,b)=>a.out-b.out);
 $('secN').textContent=list.length?list.length+(list.length>1?' peças':' peça'):'';
 if(!$('grid'))return;
 $('grid').innerHTML=list.length?list.map(p=>`<button class="card" onclick="openP('${p.id}')"><div class="ph"><img src="${img(p.imgs[0])}" alt="${esc(p.n)}">${p.out?'<div class="soldout"><span>ESGOTADO</span></div>':''}</div><p>${esc(p.n)}</p><b>${price(p.p)}</b></button>`).join('')
  :`<div class="empty">${q?'Nenhuma peça encontrada para “'+esc(q)+'”.':brand?'As peças da '+brand+' aparecem aqui assim que forem cadastradas.':'Em breve novas peças de '+cat.toLowerCase()+'.'}</div>`;
}
function openP(id,k=0){cur=id;history.replaceState(null,'','#peca-'+id);size=null;const p=byId(id);$('pCat').textContent=p.brand+' · '+p.cat;$('pName').textContent=p.n;$('pPrice').innerHTML=p.p?brl(p.p)+(DB.txt.pa?' <span>· '+esc(DB.txt.pa)+'</span>':''):'Preço sob consulta <span>· chame no WhatsApp</span>';$('pDesc').textContent=p.d;$('err').textContent='';
 const b=document.querySelector('#prod .bar .cta');b.disabled=p.out;b.textContent=p.out?'Peça esgotada':'Colocar na sacola';showImg(k);renderSizes();go('prod');}
function showImg(k){const p=byId(cur);$('bigImg').src=img(p.imgs[k]);$('thumbs').innerHTML=p.imgs.map((s,j)=>`<button class="${j===k?'on':''}" onclick="showImg(${j})" aria-label="Foto ${j+1}"><img src="${img(s)}" alt=""></button>`).join('');}
function renderSizes(){const p=byId(cur);$('sizes').innerHTML=p.sizes.map(s=>`<button class="sz ${s===size?'on':''}" onclick="size='${s}';$('err').textContent='';renderSizes()">${s}</button>`).join('')||'<span style="font-size:13px;color:var(--gold2)">Consulte pelo WhatsApp</span>';}
function addBag(){const p=byId(cur);if(p.out)return;if(p.sizes.length&&!size){$('err').textContent='Escolha o tamanho antes de colocar na sacola.';return;}
 const s=size||'—';const f=bag.find(b=>b.id===cur&&b.s===s);f?f.q++:bag.push({id:cur,s,q:1});updCount();toast('Adicionado à sacola · '+p.n+(size?' ('+size+')':''));}
function updCount(){bag=bag.filter(b=>byId(b.id));const n=bag.reduce((a,b)=>a+b.q,0);document.querySelectorAll('[data-cnt]').forEach(e=>{e.textContent=n;e.classList.remove('pop');void e.offsetWidth;e.classList.add('pop');});}
function chg(k,d){bag[k].q+=d;if(bag[k].q<=0)bag.splice(k,1);updCount();renderBag();}
function renderBag(){updCount();
 $('items').innerHTML=bag.length?bag.map((b,k)=>{const p=byId(b.id);return `<div class="item"><img src="${img(p.imgs[0])}" alt=""><div class="n">${esc(p.n)}<small>Tam. ${b.s}</small><div class="qty"><button onclick="chg(${k},-1)" aria-label="Diminuir">−</button><span>${b.q}</span><button onclick="chg(${k},1)" aria-label="Aumentar">+</button></div></div><span style="font-size:14px;white-space:nowrap">${p.p?brl(p.p*b.q):'Consulte'}</span></div>`}).join('')
  :'<div class="empty">Sua sacola está vazia.<br>Escolha uma peça na vitrine e ela aparece aqui.</div>';
 $('bagBar').hidden=!bag.length;$('modeBox').hidden=!bag.length;
 const tot=bag.reduce((a,b)=>a+(byId(b.id).p||0)*b.q,0),cons=bag.some(b=>!byId(b.id).p);$('tot').textContent=tot?brl(tot)+(cons?' + consulte':''):'A consultar';
 $('mC').classList.toggle('on',mode==='c');$('mB').classList.toggle('on',mode==='b');
 $('waTxt').textContent=mode==='c'?'Pedir condicional pelo WhatsApp':'Enviar pedido pelo WhatsApp';
 const msg=(mode==='c'?'Olá, Werika! Quero pedir um condicional com estas peças para experimentar:':'Olá, Werika! Quero comprar estas peças (envio):')+'\n\n'+bag.map(b=>{const p=byId(b.id);return `• ${b.q}x ${p.n} (tam. ${b.s}) - ${p.p?brl(p.p*b.q):'preço a consultar'}`}).join('\n')+(tot?`\n\nTotal: ${brl(tot)}`+(cons?' (+ peças com preço a consultar)':''):'')+(mode==='c'?'\n\nMeu endereço: ':'\n\nCidade/CEP para envio: ');
 $('waBtn').href=waLink(msg);}
function setMode(m){mode=m;renderBag();}
function askCond(){if(bag.length){mode='c';go('bag');return;}if(!$('home').classList.contains('on'))return;$('condWa').href=waLink('Olá, Werika! Quero pedir um condicional. Pode me mostrar os looks disponíveis?');$('condWa').click();}
function toggleMenu(){const m=$('menu');m.innerHTML=CATS.map(c=>`<button onclick="pickCat('${c}');$('secT').scrollIntoView({behavior:'smooth'})">${c}</button>`).join('');m.hidden=!m.hidden;$('search').hidden=true;}
function toggleSearch(){const s=$('search');s.hidden=!s.hidden;$('menu').hidden=true;if(!s.hidden)$('q').focus();else{$('q').value='';renderGrid();}}

/* painel */
function openAdmin(){if(location.hash!=='#admin')history.replaceState(null,'','#admin');go(logged?'admin':'login');if(!logged)setTimeout(()=>$('pw').focus(),300);}
function doLogin(btn){const pw=$('pw').value;if(!pw){$('pwErr').textContent='Digite a senha.';return;}
 busy(btn,async()=>{const {error}=await sb.auth.signInWithPassword({email:CFG.adminEmail,password:pw});
  if(error){$('pwErr').textContent=/invalid/i.test(error.message)?'Senha incorreta. Tente de novo.':'Não deu para entrar. Confira a internet.';return;}
  logged=true;$('pw').value='';go('admin');},'Entrando…');}
function logout(){sb.auth.signOut();logged=false;toHome();}
function toHome(){history.replaceState(null,'',location.pathname);go('home');}
function aTab(t){['p','h','t'].forEach(k=>{$('a'+k.toUpperCase()).hidden=k!==t;$('at'+k.toUpperCase()).classList.toggle('on',k===t);});if(t==='t')fillTxt();if(t==='h')renderHomeAdmin();}
function renderAdmin(){const P=DB.prods;$('stT').textContent=P.length;$('stE').textContent=P.filter(p=>p.out).length;$('stA').textContent=P.filter(p=>!p.out).length;
 $('aList').innerHTML=P.length?P.map(p=>`<div class="row"><img src="${img(p.imgs[0])||''}" alt=""><div class="n">${esc(p.n)}<small>${esc(p.brand)} · ${esc(p.cat)} · ${p.p?brl(p.p):'Sem preço'}</small></div><button class="st ${p.out?'no':'ok'}" onclick="toggleOut('${p.id}')" aria-label="Mudar disponibilidade">${p.out?'Esgotada':'Disponível'}</button><button class="ed" onclick="editP('${p.id}')" aria-label="Editar ${esc(p.n)}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A2E1E" stroke-width="1.8"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></div>`).join('')
  :'<div class="empty">Nenhuma peça cadastrada. Toque em “+ Nova peça” para começar.</div>';}
function toggleOut(id){const p=byId(id);busy(null,async()=>{const {error}=await sb.from('produtos').update({esgotado:!p.out}).eq('id',id);if(error)throw error;p.out=!p.out;renderAdmin();toast(p.n+(p.out?' marcada como esgotada':' disponível de novo'));});}
function editP(id){editing=id;const p=id?byId(id):{n:'',brand:allBrands()[0]||'',cat:'Vestidos',p:'',d:'',sizes:['P','M','G'],imgs:[],out:false};
 $('eTitle').textContent=id?'Editar peça':'Nova peça';$('eN').value=p.n;const bs=allBrands();if(p.brand&&!bs.includes(p.brand))bs.push(p.brand);$('eB').innerHTML=bs.map(b=>`<option ${b===p.brand?'selected':''}>${esc(b)}</option>`).join('')+'<option value="__outra">Outra marca…</option>';$('eBo').hidden=true;$('eBo').value='';$('eC').innerHTML=CATS.slice(1).map(c=>`<option ${c===p.cat?'selected':''}>${c}</option>`).join('');
 $('eP').value=p.p?p.p.toFixed(2).replace('.',','):'';$('eD').value=p.d;$('eE').checked=p.out;
 ePhotos=[...p.imgs];eSizes=[...p.sizes];$('eErr').textContent='';$('eDel').hidden=!id;$('eDel').classList.remove('sure');$('eDel').textContent='Excluir peça';
 renderEPh();renderES();go('edit');}
function renderEPh(){$('ePh').innerHTML=ePhotos.map((s,j)=>`<div><img src="${img(s)}" alt="Foto ${j+1}"><button type="button" class="x" onclick="ePhotos.splice(${j},1);renderEPh()" aria-label="Remover foto">✕</button>${j?`<button type="button" class="cv" onclick="ePhotos.unshift(ePhotos.splice(${j},1)[0]);renderEPh()">Usar como capa</button>`:'<span class="cv">Capa</span>'}<button type="button" class="adj" onclick="cropSrc(img(ePhotos[${j}]),3/4,d=>{ePhotos[${j}]=d;renderEPh();})">Ajustar</button></div>`).join('')+`<button type="button" class="add" onclick="$('eFile').click()"><b>+</b>Adicionar foto</button>`;}
function renderES(){$('eS').innerHTML=SIZES.map(s=>`<button type="button" class="sz ${eSizes.includes(s)?'on':''}" style="${s==='Único'?'width:auto;padding:0 14px;border-radius:24px':''}" onclick="eSizes=eSizes.includes('${s}')?eSizes.filter(x=>x!=='${s}'):SIZES.filter(x=>eSizes.includes(x)||x==='${s}');renderES()">${s}</button>`).join('');}
function _unused(files){[...files].forEach(f=>{const r=new FileReader();r.onload=()=>{const im=new Image();im.onload=()=>{const k=Math.min(1,700/Math.max(im.width,im.height)),c=document.createElement('canvas');c.width=im.width*k;c.height=im.height*k;c.getContext('2d').drawImage(im,0,0,c.width,c.height);ePhotos.push(c.toDataURL('image/jpeg',.78));renderEPh();};im.src=r.result;};r.readAsDataURL(f);});$('eFile').value='';}
function saveP(btn){const n=$('eN').value.trim(),pr=parseFloat($('eP').value.replace(/\./g,'').replace(',','.'));
 const br=$('eB').value==='__outra'?$('eBo').value.trim():$('eB').value;
 const e=!ePhotos.length?'Adicione pelo menos uma foto.':!n?'Digite o nome da peça.':!br?'Escreva o nome da marca.':($('eP').value.trim()&&!(pr>0))?'Confira o preço, por exemplo 239,90. Ou deixe em branco.':'';
 if(e){$('eErr').textContent=e;return;}
 busy(btn,async()=>{const old=editing?byId(editing).imgs:[];
  const imgs=await uploadAll(ePhotos);
  const data={n,brand:br,cat:$('eC').value,p:pr>0?Math.round(pr*100)/100:null,d:$('eD').value.trim(),sizes:eSizes,imgs,out:$('eE').checked};
  if(editing){const {error}=await sb.from('produtos').update(toRow(data)).eq('id',editing);if(error)throw error;Object.assign(byId(editing),data);removeFiles(old.filter(u=>!imgs.includes(u)));}
  else{const {data:row,error}=await sb.from('produtos').insert(toRow(data)).select().single();if(error)throw error;DB.prods.unshift(fromRow(row));}
  go('admin');toast(editing?'Peça atualizada':'Peça cadastrada');},ePhotos.some(s=>s.startsWith('data:'))?'Enviando fotos…':'Salvando…');}
function delP(b){if(!b.classList.contains('sure')){b.classList.add('sure');b.textContent='Toque de novo para excluir';return;}
 busy(b,async()=>{const p=byId(editing);const {error}=await sb.from('produtos').delete().eq('id',editing);if(error)throw error;
  removeFiles(p.imgs);DB.prods=DB.prods.filter(x=>x.id!==editing);bag=bag.filter(x=>x.id!==editing);go('admin');toast('Peça excluída');},'Excluindo…');}
function fillTxt(){const t=DB.txt;$('tAnn').value=t.ann;$('tPa').value=t.pa;$('tWa').value=fmtTel(t.wa);$('tErr').textContent='';}
function saveTxt(btn){let w=$('tWa').value.replace(/\D/g,'');if(w.length===10||w.length===11)w='55'+w;
 if(w.length<12){$('tErr').textContent='Confira o WhatsApp: use DDD + número, por exemplo (64) 99207-1978.';return;}
 Object.assign(DB.txt,{ann:$('tAnn').value.trim(),pa:$('tPa').value.trim(),wa:w});
 busy(btn,async()=>{await saveCfg();fillTxt();renderHome();toast('Dados da loja salvos');});}
function savePw(btn){const a=$('np1').value,b=$('np2').value;$('pErr').textContent='';
 if(a.length<6){$('pErr').textContent='A senha precisa ter pelo menos 6 caracteres.';return;}if(a!==b){$('pErr').textContent='As duas senhas não estão iguais.';return;}
 busy(btn,async()=>{const {error}=await sb.auth.updateUser({password:a});if(error)throw error;$('np1').value='';$('np2').value='';toast('Senha trocada');});}

/* ===== tela inicial em blocos ===== */
const BT={
 banner:{nm:'Banner com foto',ds:'Foto grande com título e botão',ic:'M4 5h16v14H4z M4 15l4-4 4 4 3-3 5 5'},
 brands:{nm:'Marcas',ds:'Botões das marcas que você revende',ic:'M4 7h7v10H4z M13 7h7v10h-7z'},
 cond:{nm:'Condicional',ds:'Explica como funciona o condicional',ic:'M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z'},
 shelf:{nm:'Vitrine de peças',ds:'Uma fileira de peças para deslizar',ic:'M3 6h5v12H3z M10 6h5v12h-5z M17 6h4v12h-4z'},
 notice:{nm:'Aviso',ds:'Recado curto: promoção, frete, horário',ic:'M4 9h16v6H4z'},
 text:{nm:'Texto',ds:'Título e parágrafo livre',ic:'M5 6h14 M5 11h14 M5 16h9'},
 catalog:{nm:'Todas as peças',ds:'Filtros e todas as peças. Fica sempre na tela',ic:'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z'}};
function defHome(){return[
 {id:'h1',t:'brands',on:true,title:'Marcas que você encontra aqui',list:'Isleva\nJean Darrot'},
  {id:'h3',t:'cond',on:true,title:'Peça seu condicional',text:'Eu levo os looks até você para experimentar com toda tranquilidade, conforto e praticidade.',btn:'Quero meu condicional'},
 {id:'h4',t:'notice',on:true,text:'Enviamos para todo o Brasil',style:'gold'},
 {id:'h5',t:'catalog',on:true,title:'Todas as peças'}];}
const PIN='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A46A" stroke-width="1.8"><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/></svg>';
const BOX='<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A46A" stroke-width="1.8"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>';
const brandsList=b=>String(b.list||'').split('\n').map(s=>s.trim()).filter(Boolean);
function shelfItems(b){let l=DB.prods.filter(p=>p.imgs.length&&!p.out);const f=b.filter||'new';
 if(f.startsWith('c:'))l=l.filter(p=>p.cat===f.slice(2));if(f.startsWith('b:'))l=l.filter(p=>p.brand===f.slice(2));return l.slice(0,10);}
function linkGo(l){if(!l)return;const v=l.slice(2);
 if(l.startsWith('p:')&&byId(v))openP(v);else if(l.startsWith('c:')){pickCat(v);$('secT').scrollIntoView({behavior:'smooth'});}
 else if(l.startsWith('b:')){brand=v;pickBrandName();}else if(l==='cond')askCond();}
function pickBrandName(){document.querySelectorAll('.brand').forEach(x=>x.classList.toggle('sel',x.dataset.brand===brand));renderChips();renderGrid();$('secT').scrollIntoView({behavior:'smooth',block:'start'});}
function blockHTML(b){const e=esc;switch(b.t){
 case 'banner':return b.img?`<button class="hero" onclick="linkGo('${b.link||''}')"><img src="${img(b.img)}" alt=""><div class="t">${b.sub?`<p class="eyebrow">${e(b.sub)}</p>`:''}<h2>${e(b.title||'')}</h2>${b.link&&b.btn?`<span class="hbtn">${e(b.btn)} ›</span>`:''}</div></button>`:'';
 case 'brands':{const L=brandsList(b);return L.length?`${b.title?`<p class="eyebrow" style="text-align:center;margin-top:18px">${e(b.title)}</p>`:''}<div class="brands">${L.map((n,i)=>`<button class="brand ${['is','jd'][i%2]}" data-brand="${e(n)}" onclick="pickBrand(this)">${i%2?e(n):e(n.toUpperCase())}</button>`).join('')}</div>`:'';}
 case 'cond':return `<div class="cond"><p class="eyebrow" style="color:#C9A46A">Condicional</p><h3>${e(b.title||'')}</h3><p>${e(b.text||'')}</p><div class="steps"><div><b>1</b>Escolha</div><div><b>2</b>Experimente</div><div><b>3</b>Fique com o que amar</div></div><div class="where"><span>${PIN}Atendimento em Pontalina e região</span><span>${BOX}Enviamos para todo o Brasil</span></div><button class="cta" onclick="askCond()">${e(b.btn||'Quero meu condicional')}</button></div>`;
 case 'shelf':{const L=shelfItems(b);return L.length?`<div class="sec"><h3>${e(b.title||'')}</h3></div><div class="shelf">${L.map(p=>`<button class="card" onclick="openP('${p.id}')"><div class="ph"><img src="${img(p.imgs[0])}" alt="${e(p.n)}"></div><p>${e(p.n)}</p><b>${price(p.p)}</b></button>`).join('')}</div>`:'';}
 case 'notice':return b.text?`<div class="notice ${b.style||'gold'}">${e(b.text)}</div>`:'';
 case 'text':return `<div class="tblock">${b.title?`<h3>${e(b.title)}</h3>`:''}${b.text?`<p>${e(b.text).replace(/\n/g,'<br>')}</p>`:''}</div>`;
 case 'catalog':return `<div class="sec" style="margin-top:26px"><h3>${e(b.title||'Todas as peças')}</h3></div><div class="chips" id="chips"></div><div class="sec" style="margin-top:14px"><h3 id="secT" style="font-size:20px"></h3><span class="eyebrow" id="secN"></span></div><div class="grid" id="grid"></div>`;}}
function renderHome(){const t=DB.txt;
 $('annT').textContent=t.ann;$('annT').hidden=!t.ann;$('footWa').textContent=fmtTel(t.wa);$('waTab').href=waLink('Olá, Werika! Vim pelo catálogo.');
 if(!DB.home.some(b=>b.t==='catalog'))DB.home.push({id:'hc',t:'catalog',on:true,title:'Todas as peças'});
 $('blocks').innerHTML=DB.home.filter(b=>b.on||b.t==='catalog').map(blockHTML).join('');
 document.querySelectorAll('.brand').forEach(x=>x.classList.toggle('sel',x.dataset.brand===brand));
 renderChips();renderGrid();}

/* editor da tela inicial */
let bEd=null,bNew=false;
function renderHomeAdmin(){$('hList').innerHTML=DB.home.map((b,i)=>{const T=BT[b.t];const fixed=b.t==='catalog';
 return `<div class="row brow ${b.on||fixed?'':'off'}"><span class="bic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A6534" stroke-width="1.6"><path d="${T.ic}"/></svg></span>
 <div class="n">${T.nm}<small>${esc(blockSum(b))}</small></div>
 <div class="bctl"><button onclick="mvB(${i},-1)" aria-label="Subir" ${i?'':'disabled'}>▲</button><button onclick="mvB(${i},1)" aria-label="Descer" ${i<DB.home.length-1?'':'disabled'}>▼</button></div>
 ${fixed?'':`<button class="eye ${b.on?'':'off'}" onclick="tgB(${i})" aria-label="${b.on?'Esconder':'Mostrar'}">${b.on?'Visível':'Oculto'}</button>`}
 <button class="ed" onclick="edB(${i})" aria-label="Editar ${T.nm}"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4A2E1E" stroke-width="1.8"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg></button></div>`}).join('');
 $('bPick').hidden=true;}
function blockSum(b){switch(b.t){case 'banner':return b.title||'Sem título';case 'brands':return brandsList(b).join(' · ');case 'cond':return b.title;case 'shelf':return (b.title||'')+' · '+shelfItems(b).length+' peças';case 'notice':return b.text;case 'text':return b.title||b.text;default:return 'Filtros e grade de peças';}}
function homeSave(msg){busy(null,async()=>{await saveCfg();if(msg)toast(msg);});}
function mvB(i,d){const j=i+d;if(j<0||j>=DB.home.length)return;[DB.home[i],DB.home[j]]=[DB.home[j],DB.home[i]];renderHomeAdmin();homeSave();}
function tgB(i){DB.home[i].on=!DB.home[i].on;renderHomeAdmin();homeSave(DB.home[i].on?'Bloco visível na tela inicial':'Bloco escondido');}
function showPick(){$('bPick').innerHTML=Object.entries(BT).filter(([k])=>k!=='catalog').map(([k,T])=>`<button class="pk" onclick="newB('${k}')"><span class="bic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8A6534" stroke-width="1.6"><path d="${T.ic}"/></svg></span><span><b>${T.nm}</b><small>${T.ds}</small></span></button>`).join('');$('bPick').hidden=!$('bPick').hidden;}
function newB(t){const d={banner:{img:'',title:'',sub:'',btn:'Ver mais',link:''},brands:{title:'Marcas que você encontra aqui',list:'Isleva\nJean Darrot'},cond:{title:'Peça seu condicional',text:'',btn:'Quero meu condicional'},shelf:{title:'Novidades',filter:'new'},notice:{text:'',style:'gold'},text:{title:'',text:''}}[t];
 bEd={id:'h'+Date.now(),t,on:true,...d};bNew=true;openBEd();}
function edB(i){bEd=JSON.parse(JSON.stringify(DB.home[i]));bNew=false;openBEd();}
function linkOpts(v){const o=[['','Nada (só a foto)'],['cond','Pedir condicional']].concat(DB.prods.map(p=>['p:'+p.id,'Peça: '+p.n]),CATS.slice(1).map(c=>['c:'+c,'Categoria: '+c]),allBrands().map(b=>['b:'+b,'Marca: '+b]));return o.map(([k,n])=>`<option value="${esc(k)}" ${k===v?'selected':''}>${esc(n)}</option>`).join('');}
function allBrands(){const s=new Set(['Isleva','Jean Darrot']);DB.prods.forEach(p=>s.add(p.brand));DB.home.filter(b=>b.t==='brands').forEach(b=>brandsList(b).forEach(n=>s.add(n)));s.delete('Outra marca');return [...s];}
function F(id,lb,v,tag='input',extra=''){return `<label class="lb" for="${id}">${lb}</label>${tag==='textarea'?`<textarea class="in" id="${id}" rows="3" ${extra}>${esc(v||'')}</textarea>`:`<input class="in" id="${id}" value="${esc(v||'')}" ${extra}>`}`;}
function openBEd(){const b=bEd,T=BT[b.t];$('bTitle').textContent=T.nm;let h='';
 if(b.t==='banner'){h+=`<span class="lb">Foto</span><div class="bimg" id="bImg">${b.img?`<img src="${img(b.img)}" alt="">`:'<span>Nenhuma foto escolhida</span>'}</div>
  <div class="two" style="margin-top:8px"><button type="button" class="pill" onclick="$('bFile').click()">Enviar foto</button><button type="button" class="pill" onclick="$('bLib').hidden=!$('bLib').hidden">Usar foto de uma peça</button></div>${b.img?`<button type="button" class="pill" style="width:100%;margin-top:8px" onclick="cropSrc(img(bEd.img),4/3,d=>{bEd.img=d;openBEdKeep();})">Ajustar enquadramento</button>`:''}
  <div class="lib" id="bLib" hidden>${DB.prods.flatMap(p=>p.imgs).map(s=>`<button type="button" onclick="cropSrc(this.querySelector('img').src,4/3,d=>{bEd.img=d;openBEdKeep();})"><img src="${img(s)}" alt=""></button>`).join('')}</div>`
  +F('fTitle','Título',b.title,'input','placeholder="Verão à beira-mar"')+F('fSub','Texto pequeno acima do título',b.sub,'input','placeholder="Nova coleção"')
  +`<label class="lb" for="fLink">Ao tocar no banner, abrir</label><select class="in" id="fLink">${linkOpts(b.link)}</select>`+F('fBtn','Texto do botão',b.btn);}
 if(b.t==='brands')h+=F('fTitle','Título',b.title)+F('fList','Marcas (uma por linha)',b.list,'textarea');
 if(b.t==='cond')h+=F('fTitle','Título',b.title)+F('fText','Texto',b.text,'textarea')+F('fBtn','Texto do botão',b.btn);
 if(b.t==='shelf')h+=F('fTitle','Título da vitrine',b.title,'input','placeholder="Novidades da semana"')+`<label class="lb" for="fFilter">Mostrar</label><select class="in" id="fFilter">${[['new','Peças mais recentes']].concat(CATS.slice(1).map(c=>['c:'+c,'Só '+c.toLowerCase()]),allBrands().map(x=>['b:'+x,'Só da '+x])).map(([k,n])=>`<option value="${esc(k)}" ${k===b.filter?'selected':''}>${esc(n)}</option>`).join('')}</select>`;
 if(b.t==='notice')h+=F('fText','Recado',b.text,'input','placeholder="Frete grátis acima de R$ 300"')+`<span class="lb">Cor</span><div class="stys">${[['gold','Dourado'],['dark','Escuro'],['sand','Claro']].map(([k,n])=>`<button type="button" class="notice ${k} ${b.style===k?'pk-on':''}" onclick="bEd.style='${k}';openBEdKeep()">${n}</button>`).join('')}</div>`;
 if(b.t==='text')h+=F('fTitle','Título',b.title)+F('fText','Texto',b.text,'textarea','rows="5"');
 if(b.t==='catalog')h+=F('fTitle','Título',b.title)+'<p class="note" style="margin-top:12px">Este bloco mostra todas as peças com os filtros. Ele não pode ser apagado, mas você pode mudar a posição dele.</p>';
 $('bForm').innerHTML=h;$('bErr').textContent='';$('bDel').hidden=bNew||b.t==='catalog';$('bDel').classList.remove('sure');$('bDel').textContent='Apagar bloco';
 $('bPrev').innerHTML=blockHTML(b)||'<div class="empty">Preencha os campos para ver como fica.</div>';go('bedit');}
function readB(){const v=id=>$(id)?$(id).value.trim():undefined;const b=bEd;
 ['title:fTitle','sub:fSub','btn:fBtn','text:fText','list:fList','link:fLink','filter:fFilter'].forEach(x=>{const[k,id]=x.split(':');if($(id))b[k]=$(id).value.trim();});}
function openBEdKeep(){readB();const y=scrollY;openBEd();scrollTo(0,y);}
function saveB(btn){readB();const b=bEd;
 const e=b.t==='banner'&&!b.img?'Escolha uma foto para o banner.':b.t==='notice'&&!b.text?'Escreva o recado.':b.t==='brands'&&!brandsList(b).length?'Escreva pelo menos uma marca.':b.t==='text'&&!b.title&&!b.text?'Escreva um título ou um texto.':'';
 if(e){$('bErr').textContent=e;return;}
 busy(btn,async()=>{if(b.img&&b.img.startsWith('data:'))b.img=await upload(b.img);const prev=JSON.stringify(DB.home);
  if(bNew){const ci=DB.home.findIndex(x=>x.t==='catalog');DB.home.splice(ci<0?DB.home.length:ci,0,b);}else{const i=DB.home.findIndex(x=>x.id===b.id);DB.home[i]=b;}
  try{await saveCfg();}catch(e){DB.home=JSON.parse(prev);throw e;}
  go('admin');aTab('h');toast(bNew?'Bloco adicionado à tela inicial':'Bloco salvo');},b.img&&b.img.startsWith('data:')?'Enviando foto…':'Salvando…');}
function delB(btn){if(!btn.classList.contains('sure')){btn.classList.add('sure');btn.textContent='Toque de novo para apagar';return;}
 busy(btn,async()=>{DB.home=DB.home.filter(x=>x.id!==bEd.id);await saveCfg();go('admin');aTab('h');toast('Bloco apagado');},'Apagando…');}


/* ===== ajuste de foto (enquadrar) ===== */
let cq=[],cImg=null,cR=3/4,cDone=null,cZ=1,cX=0,cY=0,cS0=1,cTotal=0,cDrag=null;
function pickFiles(files,ratio,done){const L=[...files];if(!L.length)return;cq=L;cTotal=L.length;cR=ratio;cDone=done;nextCrop();}
function nextCrop(){if(!cq.length){$('crop').hidden=true;return;}const f=cq.shift();
 if(f.type&&!f.type.startsWith('image/')){toast('Esse arquivo não é uma foto');return nextCrop();}
 const r=new FileReader();r.onload=()=>loadCrop(r.result);r.onerror=()=>{cropErr();};r.readAsDataURL(f);}
function cropSrc(src,ratio,done){cq=[];cTotal=1;cR=ratio;cDone=done;loadCrop(src);}
function cropErr(){toast('Não consegui abrir essa foto. Tente outra ou tire um print dela.');nextCrop();}
function loadCrop(src){const im=new Image();if(!src.startsWith('data:'))im.crossOrigin='anonymous';im.onload=()=>{cImg=im;$('crop').hidden=false;$('cStep').textContent=cTotal>1?`Foto ${cTotal-cq.length} de ${cTotal}`:'Ajustar foto';
 $('cFrame').style.aspectRatio=cR;$('cImgEl').src=im.src;cZ=1;$('cZoom').value=1;requestAnimationFrame(()=>{fitCrop();});};im.onerror=cropErr;im.src=src;}
function fitCrop(){const F=$('cFrame').getBoundingClientRect();cS0=Math.max(F.width/cImg.width,F.height/cImg.height);const s=cS0*cZ;cX=(F.width-cImg.width*s)/2;cY=(F.height-cImg.height*s)/2;if(cImg.height*s>F.height)cY=Math.max(cY,F.height-cImg.height*s)*.35;drawCrop();}
function clampCrop(){const F=$('cFrame').getBoundingClientRect(),s=cS0*cZ;cX=Math.min(0,Math.max(F.width-cImg.width*s,cX));cY=Math.min(0,Math.max(F.height-cImg.height*s,cY));}
function drawCrop(){clampCrop();const s=cS0*cZ,el=$('cImgEl');el.style.width=cImg.width*s+'px';el.style.height=cImg.height*s+'px';el.style.transform=`translate(${cX}px,${cY}px)`;}
function zoomCrop(z){const F=$('cFrame').getBoundingClientRect(),s1=cS0*cZ,cx=(F.width/2-cX)/s1,cy=(F.height/2-cY)/s1;cZ=+z;const s2=cS0*cZ;cX=F.width/2-cx*s2;cY=F.height/2-cy*s2;drawCrop();}
function cDown(e){cDrag={x:e.clientX,y:e.clientY,ox:cX,oy:cY};$('cFrame').setPointerCapture(e.pointerId);}
function cMove(e){if(!cDrag)return;cX=cDrag.ox+e.clientX-cDrag.x;cY=cDrag.oy+e.clientY-cDrag.y;drawCrop();}
function cUp(){cDrag=null;}
function useCrop(){const F=$('cFrame').getBoundingClientRect(),s=cS0*cZ,W=cR<1?900:1200,H=Math.round(W/cR),c=document.createElement('canvas');c.width=W;c.height=H;
 const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,W,H);g.drawImage(cImg,-cX/s,-cY/s,F.width/s,F.height/s,0,0,W,H);
 let out;try{out=c.toDataURL('image/jpeg',.8);}catch(e){return cropErr();}
 cDone&&cDone(out);if(cq.length)nextCrop();else $('crop').hidden=true;}
function skipCrop(){if(cq.length)nextCrop();else $('crop').hidden=true;}

window.addEventListener('hashchange',()=>{if(location.hash==='#admin')openAdmin();});
async function boot(){
 sb.auth.getSession().then(({data})=>{logged=!!(data&&data.session);});
 try{await loadAll();}catch(e){console.error(e);DB.home=DB.home||defHome();$('blocks').innerHTML='<div class="empty">Não foi possível carregar as peças. Confira a internet e <button onclick="location.reload()" style="text-decoration:underline">tente de novo</button>.</div>';return;}
 ready=true;renderHome();updCount();
 const h=location.hash;if(h==='#admin')openAdmin();else if(h.startsWith('#peca-')&&byId(h.slice(6)))openP(h.slice(6));}
boot();
