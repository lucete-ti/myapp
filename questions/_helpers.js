/* 해설 HTML 빌더 헬퍼 — 모든 회차 데이터 파일에서 공통 사용 */
(function(){
  // 사용 공식 블록: 공식 + (선택) 공식 이름/법칙명
  window.F = function(formula, name){
    return `<div class="fml">${formula}${name?`<span class="nm">${name}</span>`:""}</div>`;
  };
  // 기호 설명 목록: [["B","자속밀도 [Wb/m²] — 단위면적당 자속"], ...]
  window.TERMS = function(arr){
    return `<ul class="terms">`+arr.map(t=>`<li><b>${t[0]}</b><span>${t[1]}</span></li>`).join("")+`</ul>`;
  };
  // 라벨이 붙은 해설 블록. kind: ''|'terms-blk'|'steps-blk'
  window.BLK = function(label, body, kind){
    return `<div class="sol-blk ${kind||""}"><div class="sol-lbl">${label}</div>${body}</div>`;
  };
  // 사용 공식 / 기호 / 풀이 세 블록을 한 번에
  window.SOL = function(o){
    let h="";
    if(o.formula) h += window.BLK("사용 공식·법칙", o.formula);
    if(o.terms)   h += window.BLK("기호 설명", window.TERMS(o.terms), "terms-blk");
    if(o.steps)   h += window.BLK("풀이", o.steps, "steps-blk");
    if(o.note)    h += `<p class="sol-note">${o.note}</p>`;
    return h;
  };
})();
