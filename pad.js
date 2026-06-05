/* 연습장 — 문제 화면 위에 바로 그리는 오버레이 (토글)
   - 저장 없음: 끄면 즉시 지워짐
   - 펜 / 지우개 선택, 색·굵기, 전체 지우기
   사용법: window.togglePad() / window.closePad()
*/
(function(){
  "use strict";
  let overlay=null, bar=null, canvas=null, ctx=null;
  let active=false, drawing=false, last=null;
  let mode="pen", penColor="#d6453d", penSize=3;

  function el(t,c,h){const e=document.createElement(t);if(c)e.className=c;if(h!=null)e.innerHTML=h;return e;}

  function build(){
    if(overlay) return;
    overlay=el("div","pad-overlay");
    canvas=el("canvas","pad-overlay-canvas");
    ctx=canvas.getContext("2d");
    overlay.appendChild(canvas);
    document.body.appendChild(overlay);

    bar=el("div","pad-bar");
    bar.innerHTML=`
      <button class="pb pb-tool active" data-tool="pen" title="펜">✏️ 펜</button>
      <button class="pb pb-tool" data-tool="eraser" title="지우개">🩹 지우개</button>
      <span class="pb-sep"></span>
      <button class="pb pb-color active" data-color="#d6453d" style="background:#d6453d"></button>
      <button class="pb pb-color" data-color="#1c2430" style="background:#1c2430"></button>
      <button class="pb pb-color" data-color="#2256c7" style="background:#2256c7"></button>
      <button class="pb pb-color" data-color="#13935a" style="background:#13935a"></button>
      <span class="pb-sep"></span>
      <button class="pb pb-size" data-size="2" title="얇게"><i style="width:6px;height:6px"></i></button>
      <button class="pb pb-size active" data-size="3" title="중간"><i style="width:9px;height:9px"></i></button>
      <button class="pb pb-size" data-size="6" title="굵게"><i style="width:13px;height:13px"></i></button>
      <span class="pb-sep flex"></span>
      <button class="pb pb-clear">🗑 지우기</button>
      <button class="pb pb-done">✕ 닫기</button>`;
    document.body.appendChild(bar);

    bar.querySelectorAll(".pb-tool").forEach(b=>b.onclick=()=>{
      bar.querySelectorAll(".pb-tool").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); mode=b.dataset.tool;
      canvas.style.cursor = mode==="eraser"?"cell":"crosshair";
    });
    bar.querySelectorAll(".pb-color").forEach(b=>b.onclick=()=>{
      bar.querySelectorAll(".pb-color").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); penColor=b.dataset.color; setTool("pen");
    });
    bar.querySelectorAll(".pb-size").forEach(b=>b.onclick=()=>{
      bar.querySelectorAll(".pb-size").forEach(x=>x.classList.remove("active"));
      b.classList.add("active"); penSize=parseInt(b.dataset.size);
    });
    bar.querySelector(".pb-clear").onclick=clearAll;
    bar.querySelector(".pb-done").onclick=()=>togglePad();

    canvas.addEventListener("pointerdown",start);
    canvas.addEventListener("pointermove",draw);
    canvas.addEventListener("pointerup",end);
    canvas.addEventListener("pointerleave",end);
    canvas.addEventListener("pointercancel",end);
    canvas.style.touchAction="none";
    window.addEventListener("resize",()=>{ if(active) resize(true); });
  }

  function setTool(t){
    mode=t;
    bar.querySelectorAll(".pb-tool").forEach(x=>x.classList.toggle("active",x.dataset.tool===t));
    canvas.style.cursor = t==="eraser"?"cell":"crosshair";
  }

  function resize(keep){
    const dpr=Math.min(window.devicePixelRatio||1,2);
    const w=window.innerWidth, h=window.innerHeight;
    let prev=null;
    if(keep && canvas.width){ prev=document.createElement("canvas"); prev.width=canvas.width; prev.height=canvas.height; prev.getContext("2d").drawImage(canvas,0,0); }
    canvas.width=w*dpr; canvas.height=h*dpr;
    canvas.style.width=w+"px"; canvas.style.height=h+"px";
    ctx.setTransform(dpr,0,0,dpr,0,0);
    if(prev) ctx.drawImage(prev,0,0,prev.width/dpr,prev.height/dpr);
  }
  function clearAll(){ ctx.clearRect(0,0,canvas.width,canvas.height); }

  function pt(e){ const r=canvas.getBoundingClientRect(); return {x:e.clientX-r.left,y:e.clientY-r.top}; }
  function start(e){ drawing=true; last=pt(e); canvas.setPointerCapture&&canvas.setPointerCapture(e.pointerId); draw(e); }
  function draw(e){
    if(!drawing)return;
    const p=pt(e);
    ctx.lineCap="round"; ctx.lineJoin="round";
    if(mode==="eraser"){ ctx.globalCompositeOperation="destination-out"; ctx.lineWidth=penSize*9; ctx.strokeStyle="rgba(0,0,0,1)"; }
    else{ ctx.globalCompositeOperation="source-over"; ctx.lineWidth=penSize; ctx.strokeStyle=penColor; }
    ctx.beginPath(); ctx.moveTo(last.x,last.y); ctx.lineTo(p.x,p.y); ctx.stroke();
    // 점 찍기(클릭만 했을 때)
    ctx.beginPath(); ctx.arc(p.x,p.y,ctx.lineWidth/2,0,Math.PI*2);
    if(mode!=="eraser"){ ctx.fillStyle=penColor; ctx.fill(); }
    last=p;
  }
  function end(){ drawing=false; }

  function togglePad(){
    build();
    active=!active;
    overlay.classList.toggle("on",active);
    bar.classList.toggle("on",active);
    document.body.classList.toggle("pad-mode",active);
    if(active){ resize(false); clearAll(); setTool("pen"); }
    else { clearAll(); }   // 끄면 즉시 지움(저장 없음)
    // FAB 버튼 상태 갱신
    const fb=document.querySelector(".tool-btn.pad-toggle");
    if(fb) fb.classList.toggle("on",active);
    return active;
  }
  function closePad(){ if(active) togglePad(); }

  window.togglePad=togglePad;
  window.closePad=closePad;
  window.isPadActive=()=>active;
})();
