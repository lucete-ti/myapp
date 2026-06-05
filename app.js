/* 전기기능장 기출 학습앱 — 전면 개편 v3 */
(function(){
  "use strict";
  const EXAMS = window.EXAMS || [];
  const LS_KEY = "ekjang_progress_v1";
  const app = document.getElementById("app");

  /* ========== STORAGE ========== */
  function loadStore(){ try{ return JSON.parse(localStorage.getItem(LS_KEY))||{}; }catch(e){ return {}; } }
  function saveStore(s){ try{ localStorage.setItem(LS_KEY,JSON.stringify(s)); }catch(e){} }
  let store = loadStore();
  function examState(id){
    if(!store[id]) store[id]={status:{},wrongOnce:{}};
    if(!store[id].status) store[id].status={};
    if(!store[id].wrongOnce) store[id].wrongOnce={};
    return store[id];
  }
  function setStatus(examId,qn,val){
    const st=examState(examId);
    st.status[qn]=val;
    if(val==='wrong') st.wrongOnce[qn]=true;
    saveStore(store);
  }
  function clearExam(id){ store[id]={status:{},wrongOnce:{}}; saveStore(store); }
  function clearAll(){ store={}; try{localStorage.removeItem(LS_KEY);}catch(e){} }

  /* ========== HELPERS ========== */
  function el(tag,cls,html){ const e=document.createElement(tag); if(cls)e.className=cls; if(html!=null)e.innerHTML=html; return e; }
  function shuffle(a){ a=a.slice(); for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; }
  function getExam(id){ return EXAMS.find(e=>e.id===id); }
  function parseId(id){ const [y,r]=id.split('-'); return {year:y, round:r}; }

  function stats(examId){
    const ex=getExam(examId), st=examState(examId);
    let c=0,w=0,wrongNote=0;
    ex.questions.forEach(q=>{ if(st.status[q.n]==='correct')c++; else if(st.status[q.n]==='wrong')w++; if(st.wrongOnce[q.n])wrongNote++; });
    const total=ex.questions.length;
    return {c,w,u:total-c-w,wrongNote,total,pct:Math.round(c/total*100)};
  }

  /* ========== MODAL SYSTEM (브라우저 alert/confirm 대체) ========== */
  let _modalResolve=null;
  function buildModalShell(){
    if(document.getElementById('modal-overlay')) return;
    const ov=el('div','modal-overlay'); ov.id='modal-overlay';
    ov.innerHTML=`<div class="modal-box"><div class="modal-title" id="modal-title"></div><div class="modal-body" id="modal-body"></div><div class="modal-foot" id="modal-foot"></div></div>`;
    ov.addEventListener('click',e=>{ if(e.target===ov&&_modalResolve){ _modalResolve(null); closeModal(); } });
    document.body.appendChild(ov);
  }
  function openModal({title='',body='',buttons=[{label:'확인',value:true,primary:true}]}){
    buildModalShell();
    document.getElementById('modal-title').textContent=title;
    const bodyEl=document.getElementById('modal-body');
    bodyEl.innerHTML=typeof body==='string'?body:'';
    if(typeof body==='object'&&body instanceof HTMLElement){ bodyEl.innerHTML=''; bodyEl.appendChild(body); }
    const foot=document.getElementById('modal-foot'); foot.innerHTML='';
    buttons.forEach(b=>{ const btn=el('button','modal-btn'+(b.primary?' primary':'')+(b.danger?' danger':''),b.label); btn.onclick=()=>{ const v=b.value; closeModal(); if(_modalResolve){_modalResolve(v); _modalResolve=null;} }; foot.appendChild(btn); });
    document.getElementById('modal-overlay').classList.add('open');
    return new Promise(resolve=>{ _modalResolve=resolve; });
  }
  function closeModal(){ const ov=document.getElementById('modal-overlay'); if(ov)ov.classList.remove('open'); }
  function showAlert(msg,title='알림'){ return openModal({title,body:msg,buttons:[{label:'확인',value:true,primary:true}]}); }
  function showConfirm(msg,title='확인'){ return openModal({title,body:msg,buttons:[{label:'취소',value:false},{label:'확인',value:true,primary:true}]}); }
  function showConfirmDanger(msg,title='주의'){ return openModal({title,body:msg,buttons:[{label:'취소',value:false},{label:'삭제',value:true,danger:true}]}); }

  /* ========== CIRCLE PROGRESS SVG ========== */
  function circleSVG(pct,colorFill='#2256c7'){
    const r=22,cx=28,cy=28,sw=4,circ=2*Math.PI*r;
    const dash=(circ*(pct/100)).toFixed(2);
    const clr=pct>=80?'#13935a':pct>=50?colorFill:'#c77d12';
    return `<svg class="circle-prog" viewBox="0 0 56 56" width="56" height="56">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e4eaf5" stroke-width="${sw}"/>
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${clr}" stroke-width="${sw}"
        stroke-dasharray="${dash} ${circ.toFixed(2)}" stroke-dashoffset="${(circ/4).toFixed(2)}"
        stroke-linecap="round" class="cp-arc"/>
      <text x="${cx}" y="${cy+5}" text-anchor="middle" font-size="12" font-weight="800" fill="#1c2430">${pct}%</text>
    </svg>`;
  }

  /* ========== HOME ========== */
  function renderHome(){
    window.scrollTo(0,0);
    removeTools();
    app.innerHTML='';

    const top=el('div','topbar');
    top.innerHTML=`<div class="topbar-inner"><div class="home-logo"><span class="logo-badge">전기기능장</span><span class="logo-sub">필기 기출</span></div></div>`;
    app.appendChild(top);

    const sc=el('div','scroll home-scroll');

    // 다중 랜덤 배너
    const multiBtn=el('button','multi-btn');
    multiBtn.innerHTML=`<span class="multi-ic">🎲</span><div><b>여러 회차 랜덤 풀기</b><span>원하는 회차를 골라 랜덤 60문제</span></div><span class="multi-arr">›</span>`;
    multiBtn.onclick=showMultiRound;
    sc.appendChild(multiBtn);

    sc.appendChild(el('div','section-label',`회차 선택 <span class="label-cnt">${EXAMS.length}개</span>`));

    // 그리드
    const grid=el('div','exam-grid');
    const sorted=EXAMS.slice().sort((a,b)=>b.date.localeCompare(a.date));
    sorted.forEach(ex=>{
      const s=stats(ex.id);
      const {year,round}=parseId(ex.id);
      const card=el('div','eg-card');
      card.dataset.exam=ex.id;
      card.innerHTML=`
        <div class="egc-year">${year}</div>
        <div class="egc-round">${round}회</div>
        ${circleSVG(s.pct)}
        <div class="egc-legend">
          <span class="dot c"></span>${s.c} <span class="dot w"></span>${s.w} <span class="dot u"></span>${s.u}
        </div>`;
      card.onclick=()=>showExamModal(ex.id);
      grid.appendChild(card);
    });
    sc.appendChild(grid);

    // 전체 초기화
    const arRow=el('div','all-reset-row');
    const arb=el('button','all-reset-btn','⚠ 전체 회차 기록 초기화');
    arb.onclick=async()=>{
      const ok=await showConfirmDanger('모든 회차의 학습 기록(점수·오답노트 포함)을\n전부 삭제합니다. 되돌릴 수 없어요.','전체 초기화');
      if(ok){ clearAll(); renderHome(); }
    };
    arRow.appendChild(arb);
    sc.appendChild(arRow);

    sc.appendChild(el('div','footnote','그림·수식 문제는 원본 시험지 이미지 사용 · 해설은 요점정리 및 계산 검증 완료<br>진행 기록은 이 기기에 자동 저장됩니다.'));
    app.appendChild(sc);
  }

  /* ========== 회차 상세 팝업 ========== */
  function showExamModal(examId){
    const ex=getExam(examId), s=stats(examId);
    const {year,round}=parseId(examId);
    const wrap=el('div','exam-modal-inner');

    wrap.innerHTML=`
      <div class="em-header">
        <div class="em-badge">${year}년 ${round}회 <span class="em-pct-badge" style="color:${s.pct>=80?'var(--correct)':s.pct>=50?'var(--primary)':'var(--amber)'}">${s.pct}%</span></div>
        <div class="em-stats-row">
          <span><span class="dot c"></span>${s.c}</span>
          <span><span class="dot w"></span>${s.w}</span>
          <span><span class="dot u"></span>${s.u}</span>
          <span class="em-note-cnt">✕ ${s.wrongNote}</span>
        </div>
      </div>
      <div class="progress-track"><div class="progress-fill" style="width:${s.pct}%"></div></div>`;

    const modes=el('div','em-modes');
    function addMode(icon,label,sub,disabled,cb,cls=''){
      const b=el('button','em-btn'+(cls?' '+cls:''));
      b.innerHTML=`<span class="em-ic">${icon}</span><div><b>${label}</b><small>${sub}</small></div>`;
      b.disabled=!!disabled; b.onclick=()=>{ closeModal(); cb(); };
      modes.appendChild(b);
    }
    addMode('▶','순서대로',`1~${s.total}번`,false,()=>startQuiz(examId,'seq'),'primary');
    addMode('↻','이어풀기',`${s.u+s.w}문제 남음`,(s.u+s.w)===0,()=>startQuiz(examId,'resume'));
    addMode('⤮','랜덤풀기','무작위',false,()=>startQuiz(examId,'random'));
    addMode('✕','오답노트',`${s.wrongNote}문제`,s.wrongNote===0,()=>startQuiz(examId,'wrong'),'wrong-btn');
    wrap.appendChild(modes);

    const rb=el('button','em-reset-btn','↺ 이 회차 기록 초기화');
    rb.onclick=async()=>{
      const ok=await showConfirmDanger(`${year}년 ${round}회 기록을 삭제할까요?`,'초기화');
      if(ok){ clearExam(examId); closeModal(); renderHome(); }
    };
    wrap.appendChild(rb);

    openModal({title:'',body:wrap,buttons:[]});
    // X 닫기 버튼 추가
    const mbox=document.querySelector('.modal-box');
    if(mbox && !mbox.querySelector('.modal-x')){
      const x=el('button','modal-x','×');
      x.onclick=closeModal;
      mbox.prepend(x);
    }
  }

  /* ========== 여러 회차 랜덤 ========== */
  function showMultiRound(){
    const sorted=EXAMS.slice().sort((a,b)=>b.date.localeCompare(a.date));
    const wrap=el('div','multi-modal');
    wrap.innerHTML=`<div class="mm-label">회차 선택 <button class="mm-selall">전체 선택</button></div>`;
    const cbs=el('div','mm-list');
    sorted.forEach(ex=>{
      const {year,round}=parseId(ex.id);
      const s=stats(ex.id);
      const row=el('label','mm-row');
      row.innerHTML=`<input type="checkbox" class="mm-cb" value="${ex.id}" checked><span class="mm-name">${year}년 ${round}회</span><span class="mm-info">${s.total}문제 · ${s.pct}%</span>`;
      cbs.appendChild(row);
    });
    wrap.appendChild(cbs);
    const cntRow=el('div','mm-cnt-row');
    cntRow.innerHTML=`<label>문제 수 <input type="number" id="mm-cnt" value="60" min="10" max="300" step="10"><span>문제</span></label>`;
    wrap.appendChild(cntRow);

    const startBtn=el('button','mm-start','🎲 랜덤 풀기 시작');
    startBtn.onclick=()=>{
      const ids=[...wrap.querySelectorAll('.mm-cb:checked')].map(c=>c.value);
      const cnt=Math.max(10,parseInt(wrap.querySelector('#mm-cnt').value)||60);
      if(ids.length===0){ showAlert('회차를 하나 이상 선택하세요.'); return; }
      closeModal();
      startMultiQuiz(ids,cnt);
    };
    wrap.appendChild(startBtn);

    wrap.querySelector('.mm-selall').onclick=()=>{
      const cbs2=wrap.querySelectorAll('.mm-cb');
      const allChecked=[...cbs2].every(c=>c.checked);
      cbs2.forEach(c=>c.checked=!allChecked);
    };

    openModal({title:'여러 회차 랜덤 풀기',body:wrap,buttons:[]});
    const mbox=document.querySelector('.modal-box');
    if(mbox&&!mbox.querySelector('.modal-x')){ const x=el('button','modal-x','×'); x.onclick=closeModal; mbox.prepend(x); }
  }

  function startMultiQuiz(examIds,cnt){
    let pool=[];
    examIds.forEach(id=>{
      const ex=getExam(id);
      if(!ex) return;
      ex.questions.forEach((_,i)=>pool.push({examId:id,qIdx:i}));
    });
    pool=shuffle(pool).slice(0,cnt);
    if(pool.length===0){ showAlert('선택된 회차에 문제가 없습니다.'); return; }
    session={
      multi:true, examIds, mode:'random',
      queue:pool, pos:0,
      sessionCorrect:0, sessionWrong:new Set(), sessionTotal:pool.length
    };
    renderQuestion();
  }

  /* ========== QUIZ ========== */
  let session=null;
  const MODE_LABEL={seq:'순서대로',resume:'이어풀기',random:'랜덤',wrong:'오답 노트'};

  function buildQueue(examId,mode){
    const ex=getExam(examId),st=examState(examId);
    let idxs=ex.questions.map((_,i)=>i);
    if(mode==='wrong') idxs=idxs.filter(i=>!!st.wrongOnce[ex.questions[i].n]);
    else if(mode==='resume') idxs=idxs.filter(i=>st.status[ex.questions[i].n]!=='correct');
    if(mode==='random') idxs=shuffle(idxs);
    return idxs.map(i=>({examId,qIdx:i}));
  }

  function startQuiz(examId,mode){
    const queue=buildQueue(examId,mode);
    if(queue.length===0){ showAlert('풀 문제가 없습니다.'); return; }
    session={multi:false,examId,mode,queue,pos:0,sessionCorrect:0,sessionWrong:new Set(),sessionTotal:queue.length};
    renderQuestion();
  }

  function renderQuestion(){
    window.scrollTo(0,0);
    const item=session.queue[session.pos];
    const ex=getExam(item.examId);
    const q=ex.questions[item.qIdx];
    const {year,round}=parseId(item.examId);

    app.innerHTML='';
    const top=el('div','topbar');
    const inner=el('div','topbar-inner');
    const back=el('button','back','‹');
    back.setAttribute('aria-label','뒤로');
    back.onclick=async()=>{ const ok=await showConfirm('메뉴로 돌아갈까요?\n(기록은 저장됩니다)','학습 종료'); if(ok){ session=null; renderHome(); } };
    inner.appendChild(back);
    const titleTxt=session.multi?`다중 랜덤`:`${year}년 ${round}회 · ${MODE_LABEL[session.mode]}`;
    inner.appendChild(el('div','title',titleTxt));
    inner.appendChild(el('div','meta',`${session.pos+1}/${session.queue.length}`));
    top.appendChild(inner);
    const prog=el('div','q-progress');
    prog.innerHTML=`<div class="pf" style="width:${session.pos/session.queue.length*100}%"></div>`;
    top.appendChild(prog);
    app.appendChild(top);

    const sc=el('div','scroll');
    const box=el('div','qbox');

    // 회차 태그 (멀티일 때만)
    if(session.multi){
      const tag=el('div','q-exam-tag',`${year}년 ${round}회`);
      box.appendChild(tag);
    }

    // 문제 헤더
    const head=el('div','q-head');
    head.innerHTML=`<span class="q-num">${String(q.n).padStart(2,'0')}번</span>`+(q.sec?`<span class="q-sec">${q.sec}</span>`:'')+(q.topic?`<span class="q-topic">${q.topic}</span>`:'');
    box.appendChild(head);
    box.appendChild(el('div','q-text',q.q));

    if(q.img){
      const wrap=el('div','q-img-wrap');
      const im=el('img'); im.src=q.img; im.alt='문제 그림'; im.decoding='async';
      wrap.appendChild(im);
      if(q.imgOptions) wrap.appendChild(el('div','q-img-cap','※ 보기 ①~④는 위 그림을 참고하세요'));
      box.appendChild(wrap);
    }

    const optsWrap=el('div','opts');
    let optEls=[];
    const hasText=Array.isArray(q.opts)&&q.opts.length>0;
    (hasText?q.opts:['①','②','③','④']).forEach((o,i)=>{
      const n=i+1;
      const b=el('button','opt');
      b.innerHTML=`<span class="onum">${n}</span><span class="otext">${hasText?o:n+'번 선택'}</span>`;
      b.dataset.n=n;
      b.onclick=()=>choose(n,optEls,q,statusEls);
      optsWrap.appendChild(b);
      optEls.push(b);
    });
    box.appendChild(optsWrap);

    const help=el('div','help');
    box.appendChild(help);
    const statusEls={help,box,optEls,q};

    sc.appendChild(box);

    // 액션 바
    const bar=el('div','actionbar');
    let helpStep=0;
    const hintBtn=el('button','btn btn-amber','💡 힌트');
    hintBtn.onclick=()=>{
      helpStep++;
      if(helpStep===1){ showHint(help,q); hintBtn.innerHTML='📖 해설 보기'; }
      else if(helpStep>=2){ showSolution(help,q); hintBtn.innerHTML='✓ 해설 표시됨'; hintBtn.disabled=true; }
    };
    statusEls.revealSolution=()=>{ if(helpStep<2){ if(helpStep<1)showHint(help,q); showSolution(help,q); helpStep=2; hintBtn.innerHTML='✓ 해설 표시됨'; hintBtn.disabled=true; } };
    bar.appendChild(hintBtn);

    const nextBtn=el('button','btn btn-primary','다음 →');
    nextBtn.disabled=true; nextBtn.dataset.role='next'; nextBtn.onclick=goNext;
    bar.appendChild(nextBtn);
    statusEls.nextBtn=nextBtn;

    sc.appendChild(bar);
    app.appendChild(sc);
    renderTools();
  }

  function showHint(help,q){
    if(help.querySelector('.hint'))return;
    const c=el('div','help-card hint');
    c.innerHTML=`<div class="hc-head">💡 힌트</div><div class="hc-body">${q.hint||'핵심 개념을 떠올려 풀어보세요.'}</div>`;
    help.appendChild(c);
  }
  function showSolution(help,q){
    if(help.querySelector('.sol'))return;
    const c=el('div','help-card sol');
    c.innerHTML=`<div class="hc-head">📖 해설</div><div class="hc-body">${q.sol||''}</div>`;
    help.appendChild(c);
    c.scrollIntoView&&setTimeout(()=>c.scrollIntoView({behavior:'smooth',block:'nearest'}),80);
  }

  function choose(n,optEls,q,se){
    const correct=(n===q.ans);
    optEls.forEach(b=>b.classList.remove('sel','wrong'));
    const old=se.box.querySelector('.feedback'); if(old)old.remove();
    if(correct){
      optEls.forEach(b=>{ b.classList.add('locked'); if(parseInt(b.dataset.n)===q.ans)b.classList.add('correct'); });
      se.help.before(el('div','feedback ok','✅ 정답!'));
      setStatus(session.queue[session.pos].examId,q.n,'correct');
      session.sessionCorrect++;
      se.nextBtn.disabled=false;
      se.nextBtn.classList.remove('btn-primary'); se.nextBtn.classList.add('btn-correct');
    } else {
      const chosen=optEls.find(b=>parseInt(b.dataset.n)===n);
      chosen.classList.add('wrong','locked');
      se.help.before(el('div','feedback no','❌ 오답입니다. 다시 골라보세요.'));
      if(examState(session.queue[session.pos].examId).status[q.n]!=='correct')
        setStatus(session.queue[session.pos].examId,q.n,'wrong');
      session.sessionWrong.add(q.n);
    }
  }

  function goNext(){
    session.pos++;
    if(session.pos>=session.queue.length) renderDone();
    else renderQuestion();
  }

  /* ========== DONE ========== */
  function renderDone(){
    window.scrollTo(0,0);
    const total=session.sessionTotal, correct=session.sessionCorrect;
    const pct=Math.round(correct/total*100);
    const emoji=pct>=90?'🏆':pct>=70?'🎉':pct>=50?'💪':'📚';
    const msg=pct>=90?'완벽해요! 합격권입니다.':pct>=70?'잘하고 있어요!':pct>=50?'틀린 문제를 복습해봐요.':'오답 노트로 다시 다져봐요.';

    app.innerHTML='';
    const top=el('div','topbar');
    top.innerHTML=`<div class="topbar-inner"><div class="title">학습 완료</div></div>`;
    app.appendChild(top);

    const sc=el('div','scroll');
    const w=el('div','done-wrap');
    w.innerHTML=`
      <div class="done-circle">${circleSVG(pct)}</div>
      <div class="done-emoji">${emoji}</div>
      <div class="score-big">${pct}점</div>
      <p>${total}문제 중 <b>${correct}개 정답</b></p>
      <p class="done-msg">${msg}</p>`;

    const acts=el('div','done-actions');
    if(!session.multi){
      const s=stats(session.examId||session.queue[0]?.examId);
      if(s&&s.wrongNote>0){ const b=el('button','btn btn-primary',`✕ 오답 노트 (${s.wrongNote})`); b.onclick=()=>startQuiz(session.examId||session.queue[0].examId,'wrong'); acts.appendChild(b); }
    }
    const bh=el('button','btn btn-ghost','🏠 메뉴로'); bh.onclick=()=>{ session=null; renderHome(); }; acts.appendChild(bh);
    w.appendChild(acts); sc.appendChild(w); app.appendChild(sc);
  }

  /* ========== TOOLS ========== */
  function renderTools(){
    if(document.querySelector('.tool-fab'))return;
    const fab=el('div','tool-fab');
    const bc=el('button','tool-btn',`<span>🧮</span><b>계산기</b>`); bc.onclick=()=>window.openCalc&&window.openCalc(); fab.appendChild(bc);
    const bp=el('button','tool-btn pad-toggle',`<span>📝</span><b>연습장</b>`); bp.onclick=()=>window.togglePad&&window.togglePad(); fab.appendChild(bp);
    document.body.appendChild(fab);
  }
  function removeTools(){
    document.querySelectorAll('.tool-fab').forEach(n=>n.remove());
    window.closeCalc&&window.closeCalc(); window.closePad&&window.closePad();
  }

  /* ========== KEYBOARD ========== */
  document.addEventListener('keydown',e=>{
    if(!session)return;
    const next=document.querySelector('[data-role="next"]');
    if((e.key==='Enter'||e.key==='ArrowRight')&&next&&!next.disabled){ goNext(); return; }
    if(/^[1-4]$/.test(e.key)){ const b=document.querySelector(`.opt[data-n="${e.key}"]:not(.locked)`); if(b)b.click(); }
  });

  /* ========== BOOT ========== */
  if(EXAMS.length===0) app.innerHTML='<div class="scroll"><p>문제 데이터를 불러오지 못했습니다.</p></div>';
  else renderHome();
})();
