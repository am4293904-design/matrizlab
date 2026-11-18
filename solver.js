/* MatrizLab: motor matemático independiente de la interfaz.
   Eliminación de Gauss-Jordan con pivoteo parcial, para m ecuaciones y n incógnitas.
   Licencia MIT. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.MatrixSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function parseNumber(raw) {
    if (typeof raw === 'number') {
      if (!Number.isFinite(raw)) throw new Error('Número no finito.');
      return raw;
    }
    const text = String(raw ?? '').trim().replace(/\u2212/g, '-').replace(/\s+/g, '').replace(',', '.');
    if (!text) throw new Error('Hay una celda vacía. Introduce 0 si corresponde.');
    const parts = text.split('/');
    if (parts.length > 2) throw new Error('Fracción inválida: ' + raw);
    const numberPattern = /^[+-]?(?:(?:\d+(?:\.\d*)?)|(?:\.\d+))(?:e[+-]?\d+)?$/i;
    if (!parts.every(v => numberPattern.test(v))) throw new Error('Número inválido: ' + raw);
    const numerator = Number(parts[0]);
    const denominator = parts.length === 2 ? Number(parts[1]) : 1;
    const value = numerator / denominator;
    if (denominator === 0 || !Number.isFinite(value)) throw new Error('Número fuera de rango o división entre cero: ' + raw);
    return value;
  }

  function solve(A, b, options = {}) {
    if (!Array.isArray(A) || A.length === 0 || !Array.isArray(A[0]) || A[0].length === 0 || b.length !== A.length)
      throw new Error('Dimensiones de matriz inválidas.');
    const m = A.length;
    const n = A[0].length;
    if (m > 40 || n > 40) throw new Error('El límite es 40 ecuaciones y 40 incógnitas.');
    const a = A.map((row, i) => {
      if (!Array.isArray(row) || row.length !== n) throw new Error('Todas las filas deben tener ' + n + ' coeficientes.');
      return [...row.map(parseNumber), parseNumber(b[i])];
    });
    const originalA = a.map(row => row.slice(0, n));
    const originalB = a.map(row => row[n]);
    const scaleA = Math.max(...originalA.flat().map(Math.abs));
    const scaleB = Math.max(...originalB.map(Math.abs));
    // Precisión relativa: se advierte al usuario sobre sistemas mal condicionados.
    const tolA = Math.max(1e-14, scaleA * 1e-11);
    const tolB = Math.max(1e-14, scaleB * 1e-11);
    const steps = [];
    const snapshot = (m * (n + 1) <= 36);
    const record = (message) => {
      if (options.steps === false || steps.length >= 1800) return;
      steps.push({ message, matrix: snapshot ? a.map(row => row.slice()) : null });
    };
    let swaps = 0;
    let product = 1;
    const pivots = [];
    let r = 0;
    record('Matriz aumentada inicial [A | b].');

    for (let c = 0; c < n && r < m; c++) {
      let pivotRow = r;
      let maxAbs = Math.abs(a[r][c]);
      for (let i = r + 1; i < m; i++) {
        const current = Math.abs(a[i][c]);
        if (current > maxAbs) { maxAbs = current; pivotRow = i; }
      }
      if (maxAbs <= tolA) continue;
      if (pivotRow !== r) {
        [a[r], a[pivotRow]] = [a[pivotRow], a[r]];
        swaps++;
        record(`Intercambiar F${r + 1} ↔ F${pivotRow + 1} (pivoteo parcial).`);
      }
      const pivot = a[r][c];
      product *= pivot;
      for (let j = c; j <= n; j++) a[r][j] /= pivot;
      a[r][c] = 1;
      record(`Normalizar F${r + 1} dividiendo entre ${pivot.toPrecision(7)}.`);
      for (let i = 0; i < m; i++) {
        if (i === r) continue;
        const factor = a[i][c];
        if (factor === 0) continue;
        for (let j = c; j <= n; j++) a[i][j] -= factor * a[r][j];
        a[i][c] = 0;
        record(`F${i + 1} ← F${i + 1} − (${factor.toPrecision(6)}) · F${r + 1}.`);
      }
      pivots.push({ row: r, col: c });
      r++;
    }
    // Al finalizar, detectar filas incompatibles sin alterar la matriz interna de cálculo.
    const rankA = pivots.length;
    const contradictoryRows = [];
    for (let i = rankA; i < m; i++) {
      const coefficientsZero = a[i].slice(0, n).every(x => Math.abs(x) <= tolA);
      if (coefficientsZero && Math.abs(a[i][n]) > tolB) contradictoryRows.push(i);
    }
    const rankAugmented = contradictoryRows.length > 0 ? rankA + 1 : rankA;
    const determinant = m === n ? (rankA < n ? 0 : (swaps % 2 ? -1 : 1) * product) : null;
    const freeCols = Array.from({ length: n }, (_, c) => c).filter(c => !pivots.some(p => p.col === c));
    let status;
    let solution = null;
    let parametric = null;
    let residual = null;
    let relativeResidual = null;

    if (contradictoryRows.length) status = 'incompatible';
    else if (rankA < n) {
      status = 'infinito';
      parametric = Array.from({length: n}, (_, c) => {
        const isFree = freeCols.indexOf(c);
        if (isFree >= 0) return { variable: c, constant: 0, terms: [{ parameter: isFree + 1, coefficient: 1 }], free: true };
        const row = pivots.find(p => p.col === c).row;
        return { variable: c, constant: a[row][n], terms: freeCols.map((f, idx) => ({ parameter: idx + 1, coefficient: -a[row][f] })), free: false };
      });
    } else {
      status = 'unico';
      solution = Array(n).fill(0);
      for (const pivot of pivots) solution[pivot.col] = a[pivot.row][n];
      residual = 0;
      relativeResidual = 0;
      for (let i = 0; i < m; i++) {
        const ax = originalA[i].reduce((s, v, j) => s + v * solution[j], 0);
        const diff = Math.abs(ax - originalB[i]);
        const denom = originalA[i].reduce((s, v, j) => s + Math.abs(v * solution[j]), Math.abs(originalB[i]));
        residual = Math.max(residual, diff);
        relativeResidual = Math.max(relativeResidual, diff / (denom || 1));
      }
    }
    const cleaned = a.map(row => row.map((x, j) => Math.abs(x) < (j === n ? tolB : tolA) ? 0 : x));
    return { m, n, status, rref: cleaned, steps, rankA, rankAugmented,
      determinant, pivots, freeCols, contradictoryRows, solution, parametric,
      residual, relativeResidual, tolerance: tolA, rowSwaps: swaps };
  }

  return { solve, parseNumber };
});
