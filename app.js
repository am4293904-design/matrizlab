/* Interfaz MatrizLab · Aplicación estática, sin servicios externos. */
(() => {
  'use strict';
  const { solve, parseNumber } = window.MatrixSolver;
  const $ = (id) => document.getElementById(id);
  const STORAGE_KEY = 'matrizlab:workspace:v1';
  const state = { m: 3, n: 3, grid: [[2,1,-1,8],[-3,-1,2,-11],[-2,1,2,-3]].map(row => row.map(String)), result: null };
  let saveTimer;

  const clamp = (x) => Math.max(1, Math.min(40, Math.trunc(Number(x) || 3)));
  const format = (x) => {
    if (!Number.isFinite(x)) return String(x);
    if (x === 0 || Math.abs(x) < 5e-15) return '0';
    const digits = Number($('precision').value) || 6;
    const abs = Math.abs(x);
    if (abs >= 1e7 || abs < 10 ** (-digits)) return x.toExponential(Math.min(digits, 10)).replace(/\.?0+e/, 'e');
    return String(Number(x.toFixed(digits)));
  };
  const metricNumber = (x) => typeof x === 'number' ? format(x) : String(x);
  const element = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ m: state.m, n: state.n, grid: state.grid })); }
      catch (_) { /* El almacenamiento es opcional */ }
    }, 300);
  }
  function showError(message) {
    $('errorBox').textContent = message;
    $('errorBox').hidden = false;
  }
  function clearError() { $('errorBox').hidden = true; }
  function invalidate() { state.result = null; $('resultPanel').hidden = true; clearError(); }
  function resizeGrid(m, n) {
    m = clamp(m); n = clamp(n);
    const old = state.grid;
    state.grid = Array.from({length: m}, (_, i) => Array.from({length: n + 1}, (_, j) => {
      if (!old[i]) return '0';
      if (j === n) return old[i][state.n] ?? '0';
      if (j < state.n) return old[i][j] ?? '0';
      return '0';
    }));
    state.m = m; state.n = n;
    renderGrid(); invalidate(); save();
  }
  function setGrid(arr) {
    state.m = arr.length;
    state.n = arr[0].length - 1;
    state.grid = arr.map(row => row.map(String));
    renderGrid(); invalidate(); save();
  }
  function renderGrid() {
    $('numRows').value = state.m;
    $('numCols').value = state.n;
    $('matrixSize').textContent = `${state.m} ecuaciones · ${state.n} incógnitas`;
    const table = $('matrixTable');
    const header = document.createElement('thead');
    const hr = document.createElement('tr');
    hr.appendChild(element('th', null, '#'));
    for (let j = 0; j <= state.n; j++) hr.appendChild(element('th', j === state.n ? 'rhs-head' : '', j === state.n ? 'b' : `x${j + 1}`));
    header.appendChild(hr);
    const body = document.createElement('tbody');
    for (let i = 0; i < state.m; i++) {
      const row = document.createElement('tr');
      row.appendChild(element('th', null, `F${i + 1}`));
      for (let j = 0; j <= state.n; j++) {
        const cell = element('td', j === state.n ? 'rhs-cell' : '');
        const input = element('input', 'coef-input');
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.dataset.r = i;
        input.dataset.c = j;
        input.value = state.grid[i][j];
        input.setAttribute('aria-label', j === state.n ? `Ecuación ${i + 1}, término independiente b` : `Ecuación ${i + 1}, coeficiente de x${j + 1}`);
        cell.appendChild(input); row.appendChild(cell);
      }
      body.appendChild(row);
    }
    table.replaceChildren(header, body);
  }
  function splitRows(text) {
    return text.replace(/\r/g,'').trim().split('\n').map(line => line.trim()).filter(Boolean).map(line => {
      const delim = line.includes('\t') ? '\t' : line.includes(';') ? ';' : line.includes(',') ? ',' : null;
      return delim ? line.split(delim).map(v => v.trim()) : line.split(/\s+/).map(v => v.trim());
    });
  }
  function parseBulk(text) {
    const rows = splitRows(text);
    if (!rows.length || rows.length > 40) throw new Error('Pega de 1 a 40 ecuaciones.');
    const width = rows[0].length;
    if (width < 2 || width > 41) throw new Error('Cada fila necesita entre 1 y 40 coeficientes, más el término independiente.');
    if (rows.some(row => row.length !== width)) throw new Error(`Las filas deben tener ${width} columnas. Revisa los separadores y que cada ecuación incluya b.`);
    return rows.map((row, i) => row.map((v, j) => {
      try { return String(parseNumber(v)); }
      catch (err) { throw new Error(`Fila ${i + 1}, columna ${j + 1}: ${err.message}`); }
    }));
  }
  function matrixAsText() { return state.grid.map(row => row.join('\t')).join('\n'); }
  function loadExample(key) {
    if (!key) return;
    let arr;
    if (key === 'simple') arr = [[2,1,-1,8],[-3,-1,2,-11],[-2,1,2,-3]];
    else if (key === 'infinite') arr = [[1,1,1,3],[2,2,2,6]];
    else if (key === 'impossible') arr = [[1,1,2],[2,2,4],[1,1,3]];
    else if (key === 'mechanism') {
      // Matriz de demostración 9×9; solución conocida [1,...,9].
      const n = 9;
      const A = Array.from({length:n}, (_,i) => Array.from({length:n},(_,j) =>
        i===j ? 14+i : Math.abs(i-j)===1 ? -2 : Math.abs(i-j)===2 ? 1 : 0));
      arr = A.map(row => [...row, row.reduce((s,v,j)=>s+v*(j+1),0)]);
    }
    if (arr) { setGrid(arr); $('examplePicker').value = ''; }
  }
  function readGrid() {
    let bad = null;
    const numbers = state.grid.map((row, i) => row.map((value, j) => {
      try { return parseNumber(value); }
      catch (e) { if (!bad) bad = {i,j,message:e.message}; return NaN; }
    }));
    document.querySelectorAll('.coef-input').forEach(inp => inp.classList.remove('invalid'));
    if (bad) {
      const input = document.querySelector(`.coef-input[data-r="${bad.i}"][data-c="${bad.j}"]`);
      if (input) { input.classList.add('invalid'); input.focus(); }
      throw new Error(`Error en F${bad.i + 1}, columna ${bad.j + 1}: ${bad.message}`);
    }
    return { A: numbers.map(row => row.slice(0, -1)), b: numbers.map(row => row[row.length - 1]) };
  }
  function statusBar(result) {
    const configs = {
      unico: ['✓', 'Solución única encontrada', 'El sistema es compatible determinado. Se verificó el resultado sustituyéndolo en A·x = b.'],
      infinito: ['∞', 'Infinitas soluciones', 'El sistema es compatible indeterminado. Se expresa con parámetros libres.'],
      incompatible: ['!', 'El sistema no tiene solución', 'Las ecuaciones son incompatibles: aparece una fila del tipo 0 = c, donde c es distinto de cero.']
    };
    const [symbol,title,desc] = configs[result.status];
    const bar = $('resultStatus');
    bar.className = `result-status status-${result.status}`;
    const icon = element('span','status-icon',symbol);
    const block = element('div');
    block.appendChild(element('strong',null,title));
    block.appendChild(element('small',null,desc));
    bar.replaceChildren(icon,block);
  }
  function metrics(result) {
    const values = [['Rango(A)',result.rankA],['Rango([A | b])',result.rankAugmented],['Incógnitas',result.n]];
    if (result.determinant !== null) values.push(['Determinante(A)', result.determinant]);
    if (result.status === 'unico') values.push(['Error relativo máx.', Number(result.relativeResidual).toExponential(2)]);
    const wrap = $('resultMetrics');
    wrap.replaceChildren(...values.map(([label,value]) => {
      const card=element('div','metric');card.appendChild(element('span',null,label));card.appendChild(element('strong',null,metricNumber(value)));return card;
    }));
  }
  function paramText(item) {
    if (item.free) return `t${item.terms[0].parameter}`;
    const eps = state.result.tolerance;
    let out = Math.abs(item.constant) > eps ? format(item.constant) : '';
    for (const term of item.terms) {
      const v = term.coefficient;
      if (Math.abs(v) <= eps) continue;
      const sign = v < 0 ? '−' : '+';
      const coeff = Math.abs(Math.abs(v)-1) <= eps ? '' : `${format(Math.abs(v))}·`;
      const chunk = `${coeff}t${term.parameter}`;
      out += out ? ` ${sign} ${chunk}` : `${v < 0 ? '−' : ''}${chunk}`;
    }
    return out || '0';
  }
  function solutionText(result) {
    const heading = result.status === 'unico' ? 'SOLUCIÓN ÚNICA' : result.status === 'infinito' ? 'SOLUCIONES PARAMÉTRICAS' : 'SIN SOLUCIÓN';
    const lines = [`MatrizLab · ${heading}`, `Ecuaciones: ${result.m}, incógnitas: ${result.n}`, `Rango(A) = ${result.rankA}; rango([A|b]) = ${result.rankAugmented}`];
    if (result.determinant !== null) lines.push(`det(A) = ${format(result.determinant)}`);
    if (result.status === 'unico') {
      result.solution.forEach((x,i) => lines.push(`x${i+1} = ${format(x)}`));
      lines.push(`Error residual máximo |Ax-b|: ${result.residual.toExponential(4)}`);
    } else if (result.status === 'infinito') {
      result.parametric.forEach(item => lines.push(`x${item.variable+1} = ${paramText(item)}`));
      lines.push(`Parámetros libres: ${result.freeCols.length}`);
    } else lines.push('No existe vector x que satisfaga simultáneamente todas las ecuaciones.');
    return lines.join('\n');
  }
  function resultContent(result) {
    const wrap = $('resultContent');wrap.replaceChildren();
    if (result.status === 'unico') {
      wrap.appendChild(element('div','results-caption',`Vector solución x — ${result.solution.length} componentes`));
      const grid = element('div','solution-grid');
      result.solution.forEach((value,i) => {
        const card=element('div','variable-card');
        card.appendChild(element('span','var-label',`x${i+1}`));
        card.appendChild(element('span','var-number',format(value)));
        grid.appendChild(card);
      });
      wrap.appendChild(grid);
    } else if (result.status === 'infinito') {
      wrap.appendChild(element('div','param-notice',`Variables libres: ${result.freeCols.map((_,i)=>`t${i+1}`).join(', ')}. Los parámetros pueden tomar cualquier valor real.`));
      const grid=element('div','solution-grid solution-param');
      result.parametric.forEach(item=>{
        const card=element('div','variable-card');card.appendChild(element('span','var-label',`x${item.variable+1}`));
        card.appendChild(element('span',null,`= ${paramText(item)}`));grid.appendChild(card);
      });
      wrap.appendChild(grid);
    } else wrap.appendChild(element('div','param-notice',`No hay vector solución. En la matriz reducida se detectaron ${result.contradictoryRows.length} fila(s) contradictoria(s).`));
  }
  function rrefTable(matrix) {
    const table=element('table','rref-table');
    const thead=document.createElement('thead'),hr=document.createElement('tr');
    hr.appendChild(element('th',null,'Fila'));
    for(let j=0;j<=state.n;j++) hr.appendChild(element('th',null,j===state.n?'b':`x${j+1}`));
    thead.appendChild(hr);table.appendChild(thead);
    const tbody=document.createElement('tbody');
    matrix.forEach((row,i)=>{
      const tr=document.createElement('tr');tr.appendChild(element('th',null,`F${i+1}`));
      row.forEach(v=>tr.appendChild(element('td',null,format(v))));tbody.appendChild(tr);
    });table.appendChild(tbody);return table;
  }
  function renderSteps(steps) {
    $('stepsCount').textContent=`${steps.length} operaciones registradas`;
    const limit=300;
    const frag=document.createDocumentFragment();
    const list=element('div','steps-list');
    steps.slice(0,limit).forEach((step,i)=>{
      const item=element('div','step');const title=element('div','step-title');
      title.appendChild(element('span','step-index',String(i+1).padStart(2,'0')));
      title.appendChild(document.createTextNode(step.message));item.appendChild(title);
      if(step.matrix){const small=element('div','step-matrix');small.appendChild(rrefTable(step.matrix));item.appendChild(small);}
      list.appendChild(item);
    });frag.appendChild(list);
    if(steps.length>limit) frag.appendChild(element('p','step-note',`Se muestran las primeras ${limit} operaciones de ${steps.length} para mantener la página ágil.`));
    $('stepsList').replaceChildren(frag);
  }
  function renderResult(result) {
    statusBar(result); metrics(result);resultContent(result);
    $('rrefContainer').replaceChildren(rrefTable(result.rref));
    renderSteps(result.steps);
    $('resultPanel').hidden=false;
  }
  function solveCurrent() {
    clearError();
    try {
      const {A,b}=readGrid();
      state.result=solve(A,b);
      renderResult(state.result);
      $('resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
    } catch(e){showError(e.message);}
  }
  async function copy(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {await navigator.clipboard.writeText(text);return;}
      const area=element('textarea');area.value=text;area.style.position='fixed';area.style.top='-1000px';
      document.body.appendChild(area);area.select();const success=document.execCommand('copy');area.remove();
      if (!success) throw new Error('Copia bloqueada por el navegador.');
    } catch(e) {showError('No fue posible copiar automáticamente. Selecciona el texto y usa Ctrl+C.');}
  }
  function download() {
    if(!state.result)return;
    const r=state.result;
    const lines=['variable;valor'];
    if(r.status==='unico') r.solution.forEach((v,i)=>lines.push(`x${i+1};${v}`));
    else if(r.status==='infinito') r.parametric.forEach((item,i)=>lines.push(`x${i+1};"${paramText(item).replaceAll('"','""')}"`));
    else lines.push('sin_solucion;');
    lines.push(`rango_A;${r.rankA}`,`rango_aumentada;${r.rankAugmented}`);
    const blob=new Blob(['\ufeff'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const link=element('a');link.href=url;link.download='matrizlab_solucion.csv';
    document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function init() {
    try {
      const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
      if(saved && Number.isInteger(saved.m) && Number.isInteger(saved.n) && saved.m>=1 && saved.n>=1 && saved.m<=40 && saved.n<=40 &&
        Array.isArray(saved.grid) && saved.grid.length===saved.m && saved.grid.every(row=>Array.isArray(row)&&row.length===saved.n+1)){
        state.m=saved.m;state.n=saved.n;state.grid=saved.grid.map(row=>row.map(String));
      }
    }catch(_){/* Almacén inválido: usar ejemplo inicial */}
    renderGrid();
    document.querySelectorAll('[data-counter]').forEach(btn=>btn.addEventListener('click',()=>{
      const input=$(btn.dataset.counter);input.value=clamp(Number(input.value)+Number(btn.dataset.delta));resizeGrid($('numRows').value,$('numCols').value);
    }));
    $('buildBtn').addEventListener('click',()=>resizeGrid($('numRows').value,$('numCols').value));
    $('numRows').addEventListener('change',()=>resizeGrid($('numRows').value,$('numCols').value));
    $('numCols').addEventListener('change',()=>resizeGrid($('numRows').value,$('numCols').value));
    $('examplePicker').addEventListener('change',ev=>loadExample(ev.target.value));
    $('matrixTable').addEventListener('input',ev=>{
      const inp=ev.target;if(!inp.matches('.coef-input'))return;
      state.grid[Number(inp.dataset.r)][Number(inp.dataset.c)]=inp.value;
      inp.classList.remove('invalid');invalidate();save();
    });
    $('matrixTable').addEventListener('paste',ev=>{
      const inp=ev.target;if(!inp.matches('.coef-input'))return;
      const text=ev.clipboardData.getData('text/plain');
      if(!text.includes('\t')&&!text.includes('\n'))return;
      ev.preventDefault();
      const rows=splitRows(text);const startR=Number(inp.dataset.r),startC=Number(inp.dataset.c);
      rows.forEach((row,di)=>row.forEach((v,dj)=>{
        if(startR+di<state.m && startC+dj<=state.n) state.grid[startR+di][startC+dj]=v;
      }));renderGrid();invalidate();save();
      const focus=document.querySelector(`.coef-input[data-r="${startR}"][data-c="${startC}"]`);focus?.focus();
    });
    $('zerosBtn').addEventListener('click',()=>setGrid(Array.from({length:state.m},()=>Array(state.n+1).fill(0))));
    $('copyMatrixBtn').addEventListener('click',()=>copy(matrixAsText()));
    $('importBtn').addEventListener('click',()=>{
      clearError();try{setGrid(parseBulk($('bulkPaste').value));$('importDetails').open=false;}
      catch(e){showError(e.message);}
    });
    $('solveBtn').addEventListener('click',solveCurrent);
    $('precision').addEventListener('change',()=>{if(state.result)renderResult(state.result);});
    $('copyResultBtn').addEventListener('click',()=>{if(state.result)copy(solutionText(state.result));});
    $('downloadBtn').addEventListener('click',download);
  }
  document.addEventListener('DOMContentLoaded',init);
})();
