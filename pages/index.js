import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { motion } from 'framer-motion';
import { Button } from '../components/ui/button';


export default function Home() {
  const reportBoxRef = useRef(null);
  const [reportVisible, setReportVisible] = useState(false);
  useEffect(() => {

        /* ---------- Constantes légende / couleurs ---------- */
        const interfaceColors={Medicale:'#4caf50',Administrative:'#ffeb3b',Planification:'#2196f3',
                               Facturation:'#f44336',Autre:'#9e9e9e'};
        const domainColors=['#e5f4fd','#fbf4e9','#eaf7eb','#f9ebf2','#ede8fd','#fdf3e5'];
        const dpDomains=['DP Spécialités','DP Administrative','DP Commun','Dossier médico-techniques'];
        const criticityColor=l=>['Critique'].includes(l)?'#d32f2f':'#616161';
        let domainIndex=0,fullData=null;
        let reportDiff='';
    
        /* ---------- threadId persistant ---------- */
        let threadId=localStorage.getItem('chat_thread_id')||null;
    
        /* ---------- Rapport DOM ---------- */
        const reportBox=document.getElementById('report-box');
        const reportToggle=document.getElementById('report-toggle');
        reportToggle.addEventListener('click',()=>{reportBox.classList.toggle('hidden');});
    
        /* ---------- Légende ---------- */
        function createLegend(){
          const el=document.getElementById('legend');el.innerHTML='';
          Object.entries(interfaceColors).forEach(([n,c])=>{
            const wrap=document.createElement('div');wrap.className='legend-item';
            const dot=document.createElement('span');dot.className='legend-color';dot.style.backgroundColor=c;
            wrap.appendChild(dot);wrap.appendChild(document.createTextNode(n));el.appendChild(wrap);
          });
          [['#d32f2f','Criticité haute'],['#616161','Criticité standard']].forEach(([c,t])=>{
            const wrap=document.createElement('div');wrap.className='legend-item';
            const dot=document.createElement('span');dot.className='legend-color';dot.style.backgroundColor=c;
            wrap.appendChild(dot);wrap.appendChild(document.createTextNode(t));el.appendChild(wrap);
          });
          const multi=document.createElement('div');multi.className='legend-item';
          const icon=document.createElement('span');icon.textContent='🏛️';icon.className='multi-icon';
          multi.appendChild(icon);multi.appendChild(document.createTextNode(' Multi-établissement'));
          el.appendChild(multi);
        }
    
        /* ---------- Dropdowns ---------- */
        function populateDropdowns(data){
          const sets={etab:new Set(),domaine:new Set(),heberg:new Set(),interface:new Set(),multi:new Set()};
          data.etablissements.forEach(e=>{
            sets.etab.add(e.nom);
            e.domaines.forEach(d=>{
              sets.domaine.add(d.nom);
              d.processus.forEach(p=>p.applications.forEach(a=>{
                sets.heberg.add(a.hebergement);
                sets.multi.add(a.multiEtablissement?'Oui':'Non');
                Object.entries(a.interfaces).forEach(([k,v])=>v&&sets.interface.add(k));
              }));
            });
          });
          for(const [k,set] of Object.entries(sets)){
            const sel=document.getElementById('filter-'+k);
            if(!sel)continue;
            sel.innerHTML='<option value="">Tous</option>';
            [...set].sort().forEach(v=>{
              const o=document.createElement('option');o.value=v;o.textContent=v;sel.appendChild(o);
            });
          }
        }
    
        /* ---------- Rendu cartographie ---------- */
        function render(){
          const multiSelectValues=id=>[...document.getElementById(id).selectedOptions]
                                        .map(o=>o.value).filter(v=>v);
          const f={
            etab:multiSelectValues('filter-etab'),
            domaine:multiSelectValues('filter-domaine'),
            criticite:document.getElementById('filter-criticite').value,
            heberg:document.getElementById('filter-heberg').value,
            interface:document.getElementById('filter-interface').value,
            multi:document.getElementById('filter-multi').value
          };
          const cont=document.getElementById('content');cont.innerHTML='';domainIndex=0;
          const metrics={
            procTotal:0,
            procWithApps:0,
            procAppsTotal:0,
            appShown:0,
            multi:0,
            procAppsMap:{},
            dpAppTotal:0,
            ifaceCoverage:{},
            critStandard:0,
            critCritique:0,
            hebergCounts:{},
            fieldsFilled:0,
            fieldsTotal:0,
            alignTotal:0,
            alignOk:0,
            noAppProcesses:[],
            nonMultiApps:[],
            incompleteApps:[],
            alignDiffs:[]
          };
          fullData.etablissements.forEach(etab=>{
            if(f.etab.length && !f.etab.includes(etab.nom))return;
            const etabDiv=document.createElement('div');
            const h2=document.createElement('h2');h2.textContent=etab.nom;h2.style.cursor='pointer';
            const etabContent=document.createElement('div');
            h2.onclick=()=>etabContent.style.display=etabContent.style.display==='none'?'':'none';
            etabDiv.appendChild(h2);
    
            etab.domaines.forEach(dom=>{
              if(dpDomains.includes(dom.nom)){
                dom.processus.forEach(p=>p.applications.forEach(a=>{
                  metrics.dpAppTotal++;
                  Object.entries(a.interfaces).forEach(([t,v])=>{
                    if(v)metrics.ifaceCoverage[t]=(metrics.ifaceCoverage[t]||0)+1;
                  });
                }));
              }
              if(f.domaine.length && !f.domaine.includes(dom.nom))return;
              const dDiv=document.createElement('div');dDiv.className='domain';
              dDiv.style.backgroundColor=domainColors[domainIndex++%domainColors.length];
    
              const h3=document.createElement('h3');h3.textContent=dom.nom;
              const dDesc=document.createElement('p');dDesc.textContent=dom.description;
              const procCont=document.createElement('div');
    
              dom.processus.forEach(proc=>{
                metrics.procTotal++;
                metrics.procAppsTotal+=proc.applications.length;
                const pDiv=document.createElement('div');pDiv.className='process';
                pDiv.innerHTML=`<h4>${proc.nom}</h4><p>${proc.description}</p>`;
                const appWrap=document.createElement('div');appWrap.className='apps';
                let hasApp=false;
    
                proc.applications.forEach(app=>{
                  const critOk=!f.criticite||
                    (f.criticite==='Standard'&&!['Critique'].includes(app.criticite))||
                    (f.criticite==='Critique'&&['Critique'].includes(app.criticite));
                  const intOk=!f.interface||app.interfaces[f.interface];
                  const multiOk=!f.multi||((f.multi==='Oui')===app.multiEtablissement);
                  if(!critOk||(f.heberg&&app.hebergement!==f.heberg)||!intOk||!multiOk) return;
    
                  metrics.appShown++;
                  if(app.criticite==='Critique') metrics.critCritique++;
                  else metrics.critStandard++;
                  metrics.hebergCounts[app.hebergement]=(metrics.hebergCounts[app.hebergement]||0)+1;
                  metrics.fieldsTotal+=3;
                  const missing=[];
                  if(app.editeur){metrics.fieldsFilled++;}else missing.push('editeur');
                  if(app.referent){metrics.fieldsFilled++;}else missing.push('referent');
                  if(app.lienPRTG){metrics.fieldsFilled++;}else missing.push('supervision');
                  if(missing.length) metrics.incompleteApps.push({app:app.nom,etab:etab.nom,domain:dom.nom,process:proc.nom,missing});
                  if(app.multiEtablissement)metrics.multi++; else metrics.nonMultiApps.push({app:app.nom,etab:etab.nom,domain:dom.nom,process:proc.nom});
                  const key=`${dom.nom}::${proc.nom}`;
                  metrics.procAppsMap[key]=metrics.procAppsMap[key]||{};
                  metrics.procAppsMap[key][etab.nom]=metrics.procAppsMap[key][etab.nom]||new Set();
                  metrics.procAppsMap[key][etab.nom].add(app.nom);
                  hasApp=true;
    
                  const aDiv=document.createElement('div');aDiv.className='application';
                  const h5=document.createElement('h5');h5.textContent=app.nom;
                  if(app.multiEtablissement){const ico=document.createElement('span');ico.textContent='🏛️';
                    ico.className='multi-icon';h5.appendChild(ico);}
                  aDiv.appendChild(h5);
    
                  const cd=document.createElement('a');cd.className='crit-dot';
                  cd.style.backgroundColor=criticityColor(app.criticite);
                  cd.textContent=app.criticite;cd.href=app.prtg||'#';cd.target='_blank';
                  cd.title='Ouvrir le PRTG';aDiv.appendChild(cd);
    
                  const iface=document.createElement('div');
                  Object.entries(app.interfaces).forEach(([t,act])=>{
                    if(act&&interfaceColors[t]){
                      const dot=document.createElement('span');dot.className='iface-dot';
                      dot.style.backgroundColor=interfaceColors[t];dot.title=t;iface.appendChild(dot);
                    }
                  });
                  aDiv.appendChild(iface);
                  aDiv.innerHTML+=`<p>${app.description}</p><p style="font-style:italic;color:#666">
                                    Hébergement : ${app.hebergement}</p>`;
                  appWrap.appendChild(aDiv);
                });
    
                if(hasApp){
                  metrics.procWithApps++;
                  pDiv.appendChild(appWrap);procCont.appendChild(pDiv);
                } else {
                  metrics.noAppProcesses.push({domain:dom.nom,process:proc.nom});
                }
              });
    
              if(procCont.childElementCount){
                h3.style.cursor='pointer';let open=true;
                h3.onclick=()=>{open=!open;procCont.style.display=open?'':'none';dDesc.style.display=open?'':'none';};
                dDiv.appendChild(h3);dDiv.appendChild(dDesc);dDiv.appendChild(procCont);etabContent.appendChild(dDiv);
              }
            });
            etabDiv.appendChild(etabContent);cont.appendChild(etabDiv);
          });
          let alignTotal=0,alignOk=0;
          Object.entries(metrics.procAppsMap).forEach(([key,map])=>{
            const sets=Object.entries(map).map(([e,s])=>({etab:e,apps:[...s].sort()}));
            if(sets.length>1){
              alignTotal++;
              const sig=new Set(sets.map(s=>s.apps.join('|')));
              if(sig.size===1) alignOk++; else metrics.alignDiffs.push({process:key,detail:sets});
            }
          });
          metrics.alignTotal=alignTotal;
          metrics.alignOk=alignOk;
          metrics.alignPct=alignTotal?((alignOk/alignTotal)*100).toFixed(1):'0.0';
          generateReport(metrics);
        }
    
        /* ---------- Chargement JSON --------- */
        async function loadData(){
          try{
            const res=await fetch('/api/landscape');
            fullData=await res.json();
            createLegend();populateDropdowns(fullData);render();
          }catch{document.getElementById('content').textContent='Erreur de chargement.';}
        }
    
        /* Écouteurs filtres */
        ['filter-etab','filter-domaine','filter-criticite','filter-heberg','filter-interface','filter-multi']
          .forEach(id=>document.getElementById(id).addEventListener('change',render));
    
        /* ---------- Chat : DOM ---------- */
        const chatBox=document.getElementById('chatbox');
        const toggleBtn=document.getElementById('chat-toggle');
        const resetBtn=document.getElementById('chat-reset');
        const chatForm=document.getElementById('chat-form');
        const chatInput=document.getElementById('chat-q');
        const chatLog=document.getElementById('chat-log');
    
        /* Ouvrir / fermer popup */
        let toggleCount=0;
        toggleBtn.addEventListener('click',()=>{
          toggleCount++;
          if(toggleCount>=10){
            chatBox.classList.remove('hidden');
            chatBox.classList.add('minimized');
            return;
          }
          const hidden=chatBox.classList.toggle('hidden');
          if(!hidden) chatBox.classList.add('minimized');
        });
    
        /* Reset thread */
        resetBtn.addEventListener('click',resetThread);
        function resetThread(){
          localStorage.removeItem('chat_thread_id');
          threadId=null;
          addMsg('🧹 Nouvelle conversation démarrée.','bot');
        }
    
        /* Envoi message */
        chatForm.addEventListener('submit',async e=>{
          e.preventDefault();
          const q=chatInput.value.trim();
          if(!q)return;
          addMsg(q,'user');chatInput.value='';
          try{
            const r=await fetch('/api/chat',{
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body:JSON.stringify({question:q,threadId})
            });
            const {answer,threadId:ret}=await r.json();
            if(ret&&ret!==threadId){
              threadId=ret;localStorage.setItem('chat_thread_id',threadId);
            }
            addMsg(answer||'-- pas de réponse --','bot');
          }catch{addMsg('Erreur de communication avec le serveur.','bot');}
        });
    
        /* Append message au log */
        function addMsg(txt,cls){
          const div=document.createElement('div');
          div.className=`chat-msg ${cls}`;div.innerHTML=txt;
          chatLog.appendChild(div);chatLog.scrollTop=chatLog.scrollHeight;
        }
    
        /* ---------- Rapport ---------- */
    
        function generateReport(m){
          const proc=(m.procTotal?((m.procWithApps/m.procTotal)*100):0).toFixed(1);
          const appAlign=m.alignPct||'0.0';
          const mut=(m.appShown?((m.multi/m.appShown)*100):0).toFixed(1);
          const critTotal=m.critStandard+m.critCritique;
          const hebergTotal=Object.values(m.hebergCounts).reduce((a,b)=>a+b,0);
          const complPct=m.fieldsTotal?((m.fieldsFilled/m.fieldsTotal)*100).toFixed(1):'0.0';
    
          const bar=(pct,color)=>`<div class="bar"><div class="bar-fill" style="width:${pct}%;background:${color}">${pct}%</div></div>`;
          const donut=(pct,color)=>`<span class="donut" data-pct="${pct}" style="--pct:${pct};--clr:${color}"></span>`;
    
          let critHTML='';
          const cs=critTotal?((m.critStandard/critTotal)*100).toFixed(1):'0.0';
          const cc=critTotal?((m.critCritique/critTotal)*100).toFixed(1):'0.0';
          critHTML+=`<li>Standard : ${m.critStandard} (${cs}%) ${bar(cs,'#4caf50')}</li>`;
          critHTML+=`<li>Critique : ${m.critCritique} (${cc}%) ${bar(cc,'#d32f2f')}</li>`;
    
          let hebergHTML='';
          for(const [h,c] of Object.entries(m.hebergCounts)){
            const p=hebergTotal?((c/hebergTotal)*100).toFixed(1):'0.0';
            hebergHTML+=`<li>${h} : ${c} (${p}%) ${bar(p,'#1B75BC')}</li>`;
          }
    
          let ifaceHTML='';
          for(const [t,col] of Object.entries(interfaceColors)){
            const p=m.dpAppTotal?(((m.ifaceCoverage[t]||0)/m.dpAppTotal*100).toFixed(1)):0;
            ifaceHTML+=`<li>${t} : ${p}% ${bar(p,col)}</li>`;
          }
    
          const diffLines=[];
          if(m.noAppProcesses.length){
            diffLines.push('Alignement processus:');
            m.noAppProcesses.forEach(p=>diffLines.push(`- ${p.domain} :: ${p.process}`));
          }
          if(m.alignDiffs.length){
            diffLines.push('Alignement applications:');
            m.alignDiffs.forEach(d=>{
              const det=d.detail.map(s=>`${s.etab}: ${s.apps.join(', ')}`).join(' | ');
              diffLines.push(`- ${d.process} -> ${det}`);
            });
          }
          if(m.nonMultiApps.length){
            diffLines.push('Taux de mutualisation:');
            m.nonMultiApps.forEach(a=>{
              diffLines.push(`- ${a.app} (${a.etab} - ${a.domain}::${a.process})`);
            });
          }
          if(m.incompleteApps.length){
            diffLines.push('Complétude des données:');
            m.incompleteApps.forEach(a=>{
              diffLines.push(`- ${a.app} (${a.etab} - ${a.domain}::${a.process}) : manque ${a.missing.join(', ')}`);
            });
          }
          reportDiff=diffLines.join('\n');
    
          reportBox.innerHTML=
            `<h2>Rapport: Indicateurs de convergence SI</h2>`+
            `<p style="margin-top: 0; font-style: italic; color: #666;"> Synthèse des principaux indicateurs d’alignement, de mutualisation et de couverture SI sur l’ensemble des entités évaluées.</p>`+
            `<div class="kpi-row">`+
              `<section class="report-section"><h3>⚙️ Alignement processus</h3>${donut(proc,'#1B75BC')}</section>`+
              `<section class="report-section"><h3>🖥️ Alignement applications</h3>${donut(appAlign,'#1B75BC')}</section>`+
              `<section class="report-section"><h3>🏗️ Taux de mutualisation</h3>${donut(mut,'#ff9800')}</section>`+
              `<section class="report-section"><h3>📑 Complétude des données</h3>${donut(complPct,'#1B75BC')}</section>`+
            `</div>`+
            `<section class="report-section"><h3>🔥 Répartition par criticité</h3><ul>${critHTML}</ul></section>`+
            `<section class="report-section"><h3>🏢 Répartition de l'hébergement</h3><ul>${hebergHTML}</ul></section>`+
            `<section class="report-section"><h3>🧩 Couverture d'interfaces</h3><ul>${ifaceHTML}</ul></section>`+
            `<button id="copy-report-btn" title="Copier le détail">📋</button>`;
          const copyBtn=document.getElementById('copy-report-btn');
          if(copyBtn){
            copyBtn.addEventListener('click',()=>navigator.clipboard.writeText(reportDiff));
          }
        }
    
        /* ---------- Initialisation ---------- */
        createLegend();loadData();
  }, []);

  return (
    <>
      <Head>
        <title>Cartographie des Hôpitaux Publics de Corse</title>
        <meta charSet="UTF-8" />
      </Head>
      <style jsx global>{`
    /* ======== Styles généraux ======== */
    *,*::before,*::after{box-sizing:border-box;}
    body{font-family:Arial,sans-serif;margin:0;padding:0;background:#fafafa;color:#222;}

    /* ----- Bandeau héro ----- */
    .hero{background:#1B75BC;color:#fff;padding:40px 24px 32px;text-align:center;
          border-bottom-left-radius:20px;border-bottom-right-radius:20px;}
    .hero h1{margin:0;font-size:2.2rem;}
    .hero p{margin-top:10px;max-width:680px;margin:0 auto;}

    /* ----- Légende & filtres ----- */
    .legend-wrapper{background:#fff;padding:16px 24px;border-radius:12px;
                    box-shadow:0 2px 6px rgba(0,0,0,0.08);width:fit-content;margin:24px auto;}
    .legend-title{margin-bottom:16px;font-size:1.3rem;text-align:center;}
    .legend{display:flex;flex-wrap:wrap;gap:14px;justify-content:center;margin-bottom:20px;}
    .legend-item{display:inline-flex;align-items:center;font-size:0.9rem;white-space:nowrap;}
    .legend-color{width:14px;height:14px;border-radius:50%;margin-right:6px;border:1px solid rgba(0,0,0,0.25);}
    .filters{text-align:center;display:flex;flex-wrap:wrap;gap:10px;justify-content:center;}
    .filters label{display:inline-block;}
    .filters select{padding:4px;}

    /* ----- Cartographie ----- */
    .domain{background:#fff;border:1px solid #555;border-radius:8px;margin-bottom:16px;padding:10px;}
    .domain h3{cursor:pointer;margin:0 0 4px 0;}
    .process{border:1px solid #ccc;border-radius:8px;background:rgba(255,255,255,0.25);
             padding:10px;margin-bottom:16px;}
    .process h4{margin:0 0 4px 0;font-weight:bold;}
    .process p:first-of-type{margin:0 0 8px 0;color:#444;}
    .apps{display:flex;flex-wrap:wrap;gap:16px;}
    .apps .application{flex:0 0 calc(33.333% - 16px);background:#fff;border:2px solid #999;
                       border-radius:8px;position:relative;padding:10px;margin:0;}
    @media (max-width:900px){.apps .application{flex:0 0 calc(50% - 16px);} }
    @media (max-width:600px){.apps .application{flex:0 0 100%;} }
    .application h5{margin:0 0 4px 0;display:flex;align-items:center;gap:6px;}
    .crit-dot{position:absolute;top:4px;right:4px;min-width:24px;padding:2px 4px;font-size:0.7rem;
              text-align:center;border-radius:12px;color:#fff;cursor:pointer;text-decoration:none;}
    .iface-dot{display:inline-block;width:10px;height:10px;border-radius:50%;margin-right:4px;
               border:1px solid rgba(0,0,0,0.2);}
    .multi-icon{font-size:1rem;}

    /* ======== Boutons flottants ======== */
    #chat-toggle{position:fixed;bottom:20px;right:20px;z-index:10000;background:#1B75BC;color:#fff;
                 border:none;border-radius:50%;width:52px;height:52px;font-size:1.4rem;
                 box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;}
    #report-toggle{position:fixed;bottom:20px;right:80px;z-index:10000;background:#1B75BC;color:#fff;
                   border:none;border-radius:50%;width:52px;height:52px;font-size:1.4rem;
                   box-shadow:0 2px 8px rgba(0,0,0,0.2);cursor:pointer;}

    /* ======== Popup rapport ======== */
    #report-box{position:fixed;top:0;left:0;width:100vw;height:100vh;overflow:auto;
                background:#fff;z-index:9998;padding:24px;box-shadow:0 0 12px rgba(0,0,0,0.3);}
    #report-box.hidden{display:none;}
    #report-box .report-section{margin-bottom:20px;}
    .kpi-row{display:flex;flex-wrap:wrap;gap:20px;justify-content:space-around;}
    .kpi-row .report-section{flex:1;text-align:center;min-width:140px;}
    #report-box ul{list-style:none;padding:0;}
    #report-box li{margin:4px 0;}
    .bar{background:#eee;border-radius:10px;overflow:hidden;height:20px;}
    .bar-fill{height:100%;color:#fff;font-size:0.8rem;text-align:center;line-height:20px;}
    .donut{--pct:0;--clr:#1B75BC;width:80px;height:80px;border-radius:50%;background:conic-gradient(var(--clr) calc(var(--pct)*1%),#eee 0);position:relative;display:inline-block;margin-right:6px;}
    .donut::after{content:attr(data-pct) "%";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:0.8rem;font-weight:bold;color:#333;}
    #copy-report-btn{position:absolute;top:12px;right:12px;background:#eee;border:none;padding:4px 6px;border-radius:4px;font-size:0.8rem;cursor:pointer;}

    /* ======== Popup chat ======== */
    .chatbox{position:fixed;top:0;left:0;width:100vw;height:100vh;display:flex;flex-direction:column;
             background:#fff;z-index:9999;padding:24px;box-shadow:0 0 12px rgba(0,0,0,0.3);
             transition:all .3s ease;border-radius:0;}
    .chatbox.minimized{width:50vw;height:60vh;bottom:84px;right:20px;top:auto;left:auto;
                       border-radius:12px;overflow:auto;}
    .chatbox.hidden{display:none;}

    .chatbox-reset{position:absolute;top:12px;right:12px;background:#ff5252;color:#fff;
                   border:none;border-radius:8px;padding:4px 8px;cursor:pointer;}

    #chat-log{flex:1;overflow-y:auto;margin-bottom:12px;}
    .chat-msg{margin:30px 0;padding:8px 10px;border-radius:8px;white-space:pre-wrap;}
    .user{background:#1B75BC;color:#fff;text-align:right;}
    .bot{background:#eee;}
    #chat-form{display:flex;gap:6px;}
    #chat-q{flex:1;padding:8px;border-radius:8px;border:1px solid #ccc;}
      `}</style>
      <header className="hero">
        <motion.h1 initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} transition={{duration:0.5}}>
          Cartographie des Hôpitaux Publics de Corse
        </motion.h1>
        <p>Explorez les domaines, processus et applications.</p>
      </header>
      <section className="legend-wrapper">
        <h2 className="legend-title">Légende &amp; Filtres</h2>
        <div className="legend" id="legend"></div>
        <div className="filters">
          <label>Établissement : <select id="filter-etab" multiple size="4"><option value="">Tous</option></select></label>
          <label>Domaine : <select id="filter-domaine" multiple size="4"><option value="">Tous</option></select></label>
          <label>Criticité : <select id="filter-criticite"><option value="">Tous</option><option value="Standard">Standard</option><option value="Critique">Critique</option></select></label>
          <label>Hébergement : <select id="filter-heberg"><option value="">Tous</option></select></label>
          <label>Interface : <select id="filter-interface"><option value="">Toutes</option></select></label>
          <label>Multi-établissement : <select id="filter-multi"><option value="">Tous</option><option value="Oui">Oui</option><option value="Non">Non</option></select></label>
        </div>
      </section>
      <main style={{padding:'0 20px 40px'}} id="content">Chargement...</main>
      <section className="chatbox hidden" id="chatbox">
        <button className="chatbox-reset" id="chat-reset">🔁</button>
        <div id="chat-log"></div>
        <form id="chat-form">
          <input id="chat-q" placeholder="Posez votre question…" autoComplete="off" required />
          <button type="submit">Envoyer</button>
        </form>
      </section>
      <section
  id="report-box"
  ref={reportBoxRef}
  className={reportVisible ? '' : 'hidden'}
>
</section>
      <button id="chat-toggle">💬</button>
      <button
  id="report-toggle"
  onClick={() => setReportVisible(v => !v)}
>
  🧠
</button>
    </>
  );
}
