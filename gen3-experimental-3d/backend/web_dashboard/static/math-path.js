(function (root) {
  'use strict';
  const functions = {sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs, exp: Math.exp, sqrt: Math.sqrt};
  function compile(expression) {
    if (typeof expression !== 'string' || expression.length > 256) throw Error('Expression is too long');
    const tokens = expression.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[a-z]+|[()+\-*/^]/gi) || [];
    if (tokens.join('').toLowerCase() !== expression.replace(/\s/g, '').toLowerCase() || tokens.length > 128) throw Error('Invalid expression');
    let i = 0;
    function primary() {
      const token = tokens[i++];
      if (token === '(') { const node = sum(); if (tokens[i++] !== ')') throw Error('Missing closing parenthesis'); return node; }
      if (token === '+' || token === '-') { const node = primary(); return x => token === '-' ? -node(x) : node(x); }
      if (token === undefined) throw Error('Incomplete expression');
      if (/^(?:\d|\.)/.test(token)) { const value = Number(token); return () => value; }
      const name = token.toLowerCase();
      if (name === 'x') return x => x;
      if (name === 'pi') return () => Math.PI;
      if (!(name in functions) || !Object.hasOwn(functions, name) || tokens[i++] !== '(') throw Error('Unknown function or variable');
      const node = sum();
      if (tokens[i++] !== ')') throw Error('Missing closing parenthesis');
      return x => functions[name](node(x));
    }
    function power() { const left = primary(); if (tokens[i] !== '^') return left; i++; const right = power(); return x => left(x) ** right(x); }
    function product() { let left = power(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++], prev = left, right = power(); left = x => op === '*' ? prev(x) * right(x) : prev(x) / right(x); } return left; }
    function sum() { let left = product(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++], prev = left, right = product(); left = x => op === '+' ? prev(x) + right(x) : prev(x) - right(x); } return left; }
    const result = sum();
    if (i !== tokens.length) throw Error('Unexpected token');
    return result;
  }
  function generate(preset, expression, a, b, scale = 1) {
    if (!Number.isFinite(a) || !Number.isFinite(b) || a >= b || Math.abs(a) > 100 || Math.abs(b) > 100) throw Error('Use finite bounds within ±100, with From less than To');
    if (!Number.isFinite(scale) || scale <= 0 || scale > 10) throw Error('Scale must be greater than 0 and at most 10');
    const parametric = ['circle', 'spiral', 'lemniscate'].includes(preset);
    const fn = parametric ? null : compile(expression);
    const count = Math.ceil((b - a) / (parametric ? .05 : .1)) + 1;
    if (count > 5000) throw Error('Path exceeds 5000 points');
    const points = [];
    for (let i = 0; i < count; i++) {
      const t = a + (b - a) * i / (count - 1);
      let x = t, y;
      if (preset === 'circle') { x = 2 * Math.cos(t); y = 2 * Math.sin(t); }
      else if (preset === 'spiral') { const r = .1 + .15 * t; x = r * Math.cos(t); y = r * Math.sin(t); }
      else if (preset === 'lemniscate') { const d = 1 + Math.sin(t) ** 2; x = 2.5 * Math.cos(t) / d; y = 2.5 * Math.sin(t) * Math.cos(t) / d; }
      else y = fn(t);
      if (parametric) x *= scale;
      y *= scale;
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 100 || Math.abs(y) > 100) throw Error('Path values must be finite and within ±100 m');
      points.push([x, y]);
    }
    return points;
  }
  root.SurgeMathPath = {compile, generate};
})(typeof window === 'undefined' ? globalThis : window);
