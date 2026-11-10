/* Admin-only, opt-in beta operations UI. Authorization stays on the server. */
(() => {
  'use strict';
  const el = (tag, className = '', value = '') => {
    const item = document.createElement(tag);
    if (className) item.className = className;
    if (value !== '') item.textContent = String(value);
    return item;
  };
  const button = (text, fn, primary = false) => {
    const b = el('button', primary ? 'btn primary' : 'btn', text);
    b.type = 'button'; b.addEventListener('click', fn); return b;
  };
  const field = (type, label, required = true) => {
    const wrap = el('label','betaField');
    wrap.appendChild(el('span','',label));
    const input = el('input','input');input.type=type; input.required=required;
    wrap.appendChild(input);return { wrap,input };
  };
  const metric = (label, value) => {
    const c=el('div','adminStatsMetric');c.append(el('div','adminStatsMetricLabel',label),el('strong','',value));return c;
  };
  function table(headers, rows) {
    const scroll = el('div','adminStatsTableScroll');
    const tbl = el('table','adminStatsTable');
    const h=el('tr');headers.forEach(x => h.appendChild(el('th','',x)));tbl.appendChild(h);
    rows.forEach(cells => {const tr=el('tr');cells.forEach(cell => {
      const td=el('td');if (cell && typeof cell==='object' && cell.nodeType) td.appendChild(cell);
      else td.textContent=String(cell ?? '');tr.appendChild(td);
    });tbl.appendChild(tr);});
    scroll.appendChild(tbl);return scroll;
  }
  function render(host, api) {
    host.replaceChildren();
    const section=el('div','adminStats betaAdmin');
    const intro=el('div','adminStatsTop');
    intro.appendChild(el('div','', ''));
    intro.firstChild.append(el('h2','','Playtesting & Recruitment'),
      el('p','smallNote','Track referral sources, onboarding, feedback, and organized test sessions. Aggregates begin at deployment; data is retained for 90 days.'));
    const control=el('div','adminStatsControls');
    const range=el('select','input');
    [['day','Today (UTC)'],['week','7 UTC days'],['month','30 UTC days'],['quarter','90 UTC days']].forEach(([k,v]) => {
      const option=el('option','',v);option.value=k;range.appendChild(option);
    });
    range.value='week';control.append(range,button('Refresh',()=>void load()));intro.appendChild(control);
    const status=el('p','smallNote','Loading beta operations…');
    const summary=el('div','adminStatsMetrics');
    const funnels=el('div','adminStatsBreakdown');
    const daily=el('section','betaBlock');
    const referral=el('section','betaBlock');
    const feedback=el('section','betaBlock');
    const sessions=el('section','betaBlock');
    section.append(intro,status,summary,funnels,daily,referral,feedback,sessions);
    host.appendChild(section);
    let busy=false;
    async function load() {
      if(busy)return; busy=true;
      try {
        const data=await api('beta-report',{range:range.value});
        if(!host.isConnected)return;
        status.textContent=`${data.days}-day window · ${data.activeAccounts} tracked active accounts · beta started ${new Date(data.startedAt).toLocaleDateString()}. Targets: 80–150 simultaneous players.`;
        summary.replaceChildren(
          metric('Unique visitors',data.uniqueVisitors), metric('Accounts in period',data.activeAccounts),
          metric('New signups',data.totals.signups),
          metric('Tutorials finished',data.funnel.tutorialFinishes), metric('Started a game',data.funnel.gamesStarted),
          metric('Completed a game',data.funnel.gamesFinished), metric('Repeat players',data.repeatPlayers),
          metric('WebSocket disconnects',data.totals.disconnects), metric('Reconnections',data.totals.reconnects),
          metric('Expired active games',data.totals.abandonedGames), metric('Client errors',data.totals.clientErrors),
          metric('New feedback reports',data.totals.feedback));
        funnels.replaceChildren(el('h3','adminStatsSectionTitle','First-time journey (unique accounts)'));
        funnels.appendChild(table(['Stage','Players'],[
          ['Signed in / tracked',data.funnel.account],['New accounts',data.funnel.registered],['Started tutorial',data.funnel.tutorialStarts],
          ['Finished tutorial',data.funnel.tutorialFinishes],['Started a game',data.funnel.gamesStarted],
          ['Completed a game',data.funnel.gamesFinished],
        ]));
        daily.replaceChildren(el('h3','','Daily playtesting trend (UTC)'));
        daily.appendChild(table(['Date','Visits','New signups','Tutorials','Games started','Games finished','Disconnects','Feedback'],
          (data.daily||[]).map(v=>[v.day,v.visits,v.signups,v.tutorialFinishes,v.gamesStarted,v.gamesFinished,v.disconnects,v.feedback])));
        referral.replaceChildren(el('h3','','Recruitment sources'));
        const linktools=el('div','betaReferralTools');
        const input=el('input','input');input.placeholder='discord-my-group';input.maxLength=40;
        const preview=el('code','betaGeneratedLink','https://hexsettlers.org/?ref=discord-community');
        const update=()=>{const r=input.value.trim().toLowerCase();preview.textContent='https://hexsettlers.org/?ref=' + (/^[a-z0-9][a-z0-9_-]{0,39}$/.test(r)?r:'discord-community');};
        input.addEventListener('input',update);
        linktools.append(input,button('Copy referral link',()=>{
          if (!navigator.clipboard?.writeText) { status.textContent='Copy the referral link shown here.'; return; }
          navigator.clipboard.writeText(preview.textContent).then(()=>{
            status.textContent='Referral link copied.';
          }).catch(()=>{status.textContent='Copy the referral link shown here.';});
        }),preview);
        referral.append(linktools,table(['Source','Visitors','Accounts'],(data.referrals||[]).map(r=>[r.source,r.visits,r.accounts])));
        feedback.replaceChildren(el('h3','','Feedback inbox (up to 300 retained)'));
        const feedbackRows=(data.feedback||[]).slice(0,100).map(f=>{
          const body=el('div','betaFeedbackAdminText');
          body.appendChild(el('strong','',f.description));
          if(f.steps)body.appendChild(el('p','smallNote',f.steps));
          body.appendChild(el('small','','Room: '+(f.roomCode||'—')+' · '+f.device+' · '+f.build));
          const select=el('select','input');
          ['new','triaged','fixed','closed'].forEach(x=>{const o=el('option','',x);o.value=x;select.appendChild(o);});
          select.value=f.status;
          select.addEventListener('change',async()=>{
            select.disabled=true;
            try{await api('beta-feedback-status',{id:f.id,status:select.value});}
            catch(e){status.textContent=e.message;}
            finally{select.disabled=false;}
          });
          return [new Date(f.createdAt).toLocaleDateString(),f.type,body,select];
        });
        feedback.appendChild(table(['Date','Type','Report','Status'],feedbackRows));
        if(!feedbackRows.length)feedback.appendChild(el('p','smallNote','No reports yet.'));
        sessions.replaceChildren(el('h3','','Community Discord'));
        const discordTools=el('div','betaReferralTools');
        const discordInput=el('input','input'); discordInput.placeholder='https://discord.gg/invite';
        discordInput.value=data.discordInvite || ''; discordInput.maxLength=130;
        discordTools.append(discordInput,button('Save Discord link',async()=>{
          try {await api('beta-config-save',{discordInvite:discordInput.value});
            status.textContent='Discord invitation link saved.';}
          catch(error){status.textContent=error.message;}
        }));
        sessions.appendChild(discordTools);
        sessions.appendChild(el('h3','','Scheduled multiplayer sessions'));
        sessions.appendChild(el('p','smallNote','These appear in All Games for players. Enter dates in your browser’s local timezone.'));
        const form=el('form','betaScheduleForm');
        const title=field('text','Session title'), start=field('datetime-local','Starts'),end=field('datetime-local','Ends');
        const notes=field('text','Notes (optional)',false);notes.input.maxLength=400;title.input.maxLength=90;
        const save=el('button','btn primary','Schedule session');save.type='submit';
        form.append(title.wrap,start.wrap,end.wrap,notes.wrap,save);
        form.addEventListener('submit',async e=>{
          e.preventDefault();save.disabled=true;
          try {await api('beta-session-save',{title:title.input.value,notes:notes.input.value,
            startAt:new Date(start.input.value).getTime(),endAt:new Date(end.input.value).getTime()});
            status.textContent='Session saved.';void load();form.reset();}
          catch(err){status.textContent=err.message;}finally{save.disabled=false;}
        });
        sessions.appendChild(form);
        const list=el('div','betaSessionManageList');
        (data.sessions||[]).forEach(item=>{
          const row=el('div','betaSessionManageRow');
          row.appendChild(el('span','',`${item.title} · ${new Date(item.startAt).toLocaleString()} – ${new Date(item.endAt).toLocaleTimeString()}`));
          row.appendChild(button('Delete',async()=>{
            try{await api('beta-session-delete',{id:item.id});void load();}
            catch(error){status.textContent=error.message;}
          }));list.appendChild(row);
        });
        sessions.appendChild(list);
      } catch(error){status.textContent='Beta analytics unavailable: '+error.message;}
      finally{busy=false;}
    }
    range.addEventListener('change',()=>void load());
    void load();
  }
  window.renderHexBetaAdmin = render;
})();
