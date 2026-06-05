/* 공학용 계산기 (CASIO fx-570ES PLUS 스타일)
   - π, e, Ans, 분수(결과 분수 표시), S⇔D(분수/소수 토글), DEG/RAD
   - SHIFT 보조기능, 이동 가능 팝업
   사용법: window.openCalc()
*/
(function(){
  "use strict";
  const CALC_LS = "ekjang_calc_v2";

  let panel=null, dispEl=null, subEl=null, indShift=null, indMode=null, indMem=null;
  let expr="", cursor=0;
  let lastAns=0, lastVal=null, mem=0;
  let degMode=true, shift=false, justEval=false;
  let resultMode="auto"; // auto: 분수/π우선,  dec: 소수

  /* ---------- 상태 저장 ---------- */
  function load(){ try{const s=JSON.parse(localStorage.getItem(CALC_LS));if(s){lastAns=s.ans||0;mem=s.mem||0;degMode=s.deg!==false;}}catch(e){} }
  function save(){ try{localStorage.setItem(CALC_LS,JSON.stringify({ans:lastAns,mem,deg:degMode}));}catch(e){} }

  function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}
  function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

  /* ---------- 식 → JS 변환 ---------- */
  function toJS(raw){
    let t = raw;
    // 암시적 곱셈: 값 뒤에 (, π, √, 함수, ×10ⁿ 가 오면 ×
    t = t.replace(/([0-9π\)]|Ans)(?=(\(|π|√|³√|sin\(|cos\(|tan\(|asin\(|acos\(|atan\(|log\(|ln\(|exp\())/g,"$1×");
    // 후위 거듭제곱
    t = t.replace(/⁻¹/g,"^(-1)").replace(/²/g,"^(2)").replace(/³/g,"^(3)");
    // 함수 → 플레이스홀더(글자 충돌 방지), 긴 이름 먼저
    const map=[["asin(","Ⓐ("],["acos(","Ⓑ("],["atan(","Ⓒ("],
               ["sin(","Ⓢ("],["cos(","Ⓚ("],["tan(","Ⓣ("],
               ["log(","Ⓛ("],["ln(","Ⓝ("],["exp(","Ⓔ("],
               ["³√(","Ⓡ("],["√(","Ⓥ("]];
    map.forEach(([a,b])=>{ t=t.split(a).join(b); });
    // 상수
    t = t.split("Ans").join("(__ANS__)");
    t = t.replace(/π/g,"(Math.PI)");
    t = t.replace(/e/g,"(Math.E)");
    // 연산자
    t = t.replace(/×10\^/g,"*10**").replace(/×/g,"*").replace(/÷/g,"/").replace(/−/g,"-").replace(/\^/g,"**");
    t = t.replace(/(\d+(?:\.\d+)?)%/g,"($1/100)");
    // 플레이스홀더 → JS
    t = t.split("Ⓐ").join("_asin").split("Ⓑ").join("_acos").split("Ⓒ").join("_atan")
         .split("Ⓢ").join("_sin").split("Ⓚ").join("_cos").split("Ⓣ").join("_tan")
         .split("Ⓛ").join("Math.log10").split("Ⓝ").join("Math.log").split("Ⓔ").join("Math.exp")
         .split("Ⓡ").join("Math.cbrt").split("Ⓥ").join("Math.sqrt")
         .split("__ANS__").join("("+lastAns+")");
    return t;
  }

  function evaluate(){
    if(!expr.trim()) return;
    try{
      const js = toJS(expr);
      const _sin=x=>degMode?Math.sin(x*Math.PI/180):Math.sin(x);
      const _cos=x=>degMode?Math.cos(x*Math.PI/180):Math.cos(x);
      const _tan=x=>degMode?Math.tan(x*Math.PI/180):Math.tan(x);
      const _asin=x=>degMode?Math.asin(x)*180/Math.PI:Math.asin(x);
      const _acos=x=>degMode?Math.acos(x)*180/Math.PI:Math.acos(x);
      const _atan=x=>degMode?Math.atan(x)*180/Math.PI:Math.atan(x);
      const fn=new Function("_sin","_cos","_tan","_asin","_acos","_atan","return ("+js+");");
      let r=fn(_sin,_cos,_tan,_asin,_acos,_atan);
      if(typeof r!=="number"||!isFinite(r)) throw 0;
      if(Math.abs(r)<1e-12) r=0;
      lastAns=r; lastVal=r; justEval=true; resultMode="auto"; save();
      renderResult();
    }catch(e){ subEl.innerHTML="<span class='err'>Math ERROR</span>"; lastVal=null; }
  }

  /* ---------- 결과 표시(분수/π/소수) ---------- */
  function toFraction(x,maxDen){
    maxDen=maxDen||100000;
    if(!isFinite(x)) return null;
    const sign=x<0?-1:1; x=Math.abs(x);
    let h1=1,h0=0,k1=0,k0=1,b=x,it=0;
    do{
      const a=Math.floor(b);
      let aux=h1; h1=a*h1+h0; h0=aux;
      aux=k1; k1=a*k1+k0; k0=aux;
      if(Math.abs(b-a)<1e-12) break;
      b=1/(b-a); it++;
    }while(k1<=maxDen && it<40 && isFinite(b));
    if(k1<1||k1>maxDen) return null;
    if(Math.abs(x-h1/k1)>1e-9) return null;
    return {n:sign*h1,d:k1};
  }
  function decStr(n){
    if(n===0) return "0";
    if(Math.abs(n)>=1e10||(Math.abs(n)<1e-4)) return n.toExponential(7).replace(/\.?0+e/,"e");
    return ""+Number(n.toPrecision(11));
  }
  function fracHTML(n,d){ return `<span class="rfrac"><span class="rn">${n}</span><span class="rd">${d}</span></span>`; }
  function renderResult(){
    const x=lastVal;
    if(x==null) return;
    if(resultMode==="dec"){ subEl.innerHTML=esc(decStr(x)); return; }
    // 1) π 형태
    if(x!==0){
      const r=x/Math.PI, fr=toFraction(r,10000);
      if(fr && Math.abs(fr.n)<=100000 && Math.abs(fr.n/fr.d*Math.PI - x)<1e-9){
        const n=fr.n, d=fr.d;
        let numTxt = (Math.abs(n)===1? (n<0?"−π":"π") : (n<0?"−":"")+Math.abs(n)+"π");
        if(d===1){ subEl.innerHTML=esc(numTxt); return; }
        subEl.innerHTML=fracHTML(esc(numTxt), d); return;
      }
    }
    // 2) 분수
    const f=toFraction(x,100000);
    if(f && f.d>1 && f.d<=100000){
      subEl.innerHTML=(f.n<0?"−":"")+fracHTML(Math.abs(f.n), f.d); return;
    }
    if(f && f.d===1){ subEl.innerHTML=esc(""+f.n); return; }
    // 3) 소수
    subEl.innerHTML=esc(decStr(x));
  }
  function toggleSD(){
    if(lastVal==null) return;
    resultMode = (resultMode==="auto"?"dec":"auto");
    renderResult();
  }

  /* ---------- 입력 ---------- */
  function valueStart(s){ return /^[0-9.πe(√]/.test(s)||/^(sin|cos|tan|asin|acos|atan|log|ln|exp|³√|Ans)/.test(s); }
  function insert(text){
    if(justEval){
      justEval=false;
      if(valueStart(text)){ expr=""; cursor=0; }       // 결과 후 값 입력 → 새 계산
      else if(/^[+\-×÷\^%]/.test(text)){ expr="Ans"; cursor=3; } // 연산자 → Ans 이어쓰기
      subEl.textContent="";
    }
    expr=expr.slice(0,cursor)+text+expr.slice(cursor);
    cursor+=text.length; renderInput();
  }
  function del(){ if(cursor>0){ expr=expr.slice(0,cursor-1)+expr.slice(cursor); cursor--; renderInput(); } }
  function ac(){ expr=""; cursor=0; lastVal=null; justEval=false; subEl.textContent=""; renderInput(); }
  function renderInput(){
    const head=esc(expr.slice(0,cursor)), tail=esc(expr.slice(cursor));
    dispEl.innerHTML=head+'<span class="cur"></span>'+tail;
    dispEl.scrollLeft=dispEl.scrollWidth;
  }

  /* ---------- 키 정의 ---------- */
  const KEYS=[
    {cols:6, row:[
      {l:"SHIFT",cls:"k-shift",on:toggleShift},
      {l:"DEG",sl:"RAD",cls:"k-mode",on:()=>{degMode=!degMode;save();updMode();}},
      {l:"a b/c",cls:"k-fn",on:()=>insert("/")},
      {l:"x²",sl:"x³",cls:"k-fn",on:()=>insert("²"),os:()=>insert("³")},
      {l:"xʸ",sl:"ˣ√",cls:"k-fn",on:()=>insert("^("),os:()=>insert("³√(")},
      {l:"x⁻¹",cls:"k-fn",on:()=>insert("⁻¹")},
    ]},
    {cols:6, row:[
      {l:"√",cls:"k-fn",on:()=>insert("√(")},
      {l:"sin",sl:"sin⁻¹",cls:"k-fn",on:()=>insert("sin("),os:()=>insert("asin(")},
      {l:"cos",sl:"cos⁻¹",cls:"k-fn",on:()=>insert("cos("),os:()=>insert("acos(")},
      {l:"tan",sl:"tan⁻¹",cls:"k-fn",on:()=>insert("tan("),os:()=>insert("atan(")},
      {l:"log",sl:"10ˣ",cls:"k-fn",on:()=>insert("log("),os:()=>insert("×10^(")},
      {l:"ln",sl:"eˣ",cls:"k-fn",on:()=>insert("ln("),os:()=>insert("exp(")},
    ]},
    {cols:6, row:[
      {l:"π",cls:"k-const",on:()=>insert("π")},
      {l:"e",cls:"k-const",on:()=>insert("e")},
      {l:"(",on:()=>insert("(")},
      {l:")",on:()=>insert(")")},
      {l:"←",on:()=>{if(cursor>0){cursor--;renderInput();}}},
      {l:"→",on:()=>{if(cursor<expr.length){cursor++;renderInput();}}},
    ]},
    {cols:6, row:[
      {l:"M+",sl:"M−",cls:"k-mem",on:()=>{if(lastVal!=null){mem+=lastVal;save();blinkM();}},os:()=>{if(lastVal!=null){mem-=lastVal;save();blinkM();}}},
      {l:"MR",sl:"MC",cls:"k-mem",on:()=>insert(decStr(mem)),os:()=>{mem=0;save();blinkM();}},
      {l:"S⇔D",cls:"k-mem",on:toggleSD},
      {l:"Ans",cls:"k-const",on:()=>insert("Ans")},
      {l:"DEL",cls:"k-del",on:del},
      {l:"AC",cls:"k-ac",on:ac},
    ]},
    {cols:5, row:[
      {l:"7",cls:"k-n",on:()=>insert("7")},{l:"8",cls:"k-n",on:()=>insert("8")},{l:"9",cls:"k-n",on:()=>insert("9")},
      {l:"×",cls:"k-op",on:()=>insert("×")},{l:"÷",cls:"k-op",on:()=>insert("÷")},
    ]},
    {cols:5, row:[
      {l:"4",cls:"k-n",on:()=>insert("4")},{l:"5",cls:"k-n",on:()=>insert("5")},{l:"6",cls:"k-n",on:()=>insert("6")},
      {l:"+",cls:"k-op",on:()=>insert("+")},{l:"−",cls:"k-op",on:()=>insert("−")},
    ]},
    {cols:5, row:[
      {l:"1",cls:"k-n",on:()=>insert("1")},{l:"2",cls:"k-n",on:()=>insert("2")},{l:"3",cls:"k-n",on:()=>insert("3")},
      {l:"%",cls:"k-op",on:()=>insert("%")},{l:"×10ˣ",cls:"k-op",on:()=>insert("×10^(")},
    ]},
    {cols:5, row:[
      {l:"0",cls:"k-n",on:()=>insert("0")},{l:".",cls:"k-n",on:()=>insert(".")},
      {l:"(−)",cls:"k-n",on:()=>insert("−")},
      {l:"Ans",cls:"k-const",on:()=>insert("Ans")},
      {l:"=",cls:"k-eq",on:evaluate},
    ]},
  ];

  function toggleShift(){ shift=!shift; panel.classList.toggle("shift-on",shift); indShift.textContent=shift?"S":""; }
  function updMode(){ indMode.textContent=degMode?"D":"R"; }
  function blinkM(){ indMem.textContent=mem?"M":""; indMem.classList.add("blink"); setTimeout(()=>indMem.classList.remove("blink"),200); }

  /* ---------- 패널 ---------- */
  function build(){
    if(panel) return panel;
    panel=el("div","calc-panel");
    panel.innerHTML=`
      <div class="calc-head">
        <div class="calc-brand">CASIO <span>fx-570ES PLUS</span></div>
        <button class="calc-close" aria-label="닫기">×</button>
      </div>
      <div class="calc-screen">
        <div class="calc-inds"><span id="ci-s"></span><span id="ci-m">D</span><span id="ci-mem"></span><span class="ci-math">Math</span></div>
        <div class="calc-disp" id="ci-disp"></div>
        <div class="calc-sub" id="ci-sub"></div>
      </div>
      <div class="calc-keys" id="ci-keys"></div>`;
    dispEl=panel.querySelector("#ci-disp"); subEl=panel.querySelector("#ci-sub");
    indShift=panel.querySelector("#ci-s"); indMode=panel.querySelector("#ci-m"); indMem=panel.querySelector("#ci-mem");
    const keys=panel.querySelector("#ci-keys");
    KEYS.forEach(rowDef=>{
      const r=el("div","calc-row cols"+rowDef.cols);
      rowDef.row.forEach(k=>{
        const b=el("button","ck "+(k.cls||""));
        b.innerHTML=`<span class="kl">${k.l}</span>`+(k.sl?`<span class="ks">${k.sl}</span>`:"");
        b.addEventListener("click",ev=>{
          ev.preventDefault();
          if(shift&&k.os) k.os(); else if(k.on) k.on();
          if(shift&&k.l!=="SHIFT"){ shift=false; panel.classList.remove("shift-on"); indShift.textContent=""; }
        });
        r.appendChild(b);
      });
      keys.appendChild(r);
    });
    panel.querySelector(".calc-close").onclick=closeCalc;
    makeDraggable(panel,panel.querySelector(".calc-head"));
    document.body.appendChild(panel);
    return panel;
  }

  function makeDraggable(target,handle){
    let drag=false,ox=0,oy=0;
    handle.style.cursor="move";
    handle.addEventListener("pointerdown",e=>{
      if(e.target.closest(".calc-close"))return;
      drag=true; const r=target.getBoundingClientRect(); ox=e.clientX-r.left; oy=e.clientY-r.top;
      handle.setPointerCapture(e.pointerId); e.preventDefault();
    });
    handle.addEventListener("pointermove",e=>{
      if(!drag)return;
      const r=target.getBoundingClientRect();
      let x=Math.max(0,Math.min(window.innerWidth-r.width,e.clientX-ox));
      let y=Math.max(0,Math.min(window.innerHeight-r.height,e.clientY-oy));
      target.style.left=x+"px"; target.style.top=y+"px"; target.style.right="auto"; target.style.bottom="auto";
    });
    handle.addEventListener("pointerup",()=>drag=false);
    handle.addEventListener("pointercancel",()=>drag=false);
  }

  function openCalc(){
    load(); build(); panel.classList.add("open"); updMode();
    indMem.textContent=mem?"M":""; renderInput();
    if(!panel.style.left){
      const w=window.innerWidth,h=window.innerHeight, pw=320, ph=470;
      panel.style.left=Math.max(8,w-pw-16)+"px";
      panel.style.top =Math.max(8,h-ph-90)+"px";
    }
  }
  function closeCalc(){ if(panel) panel.classList.remove("open"); }
  window.openCalc=openCalc; window.closeCalc=closeCalc;
})();
