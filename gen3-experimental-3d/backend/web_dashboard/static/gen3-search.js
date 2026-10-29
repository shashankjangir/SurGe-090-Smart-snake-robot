'use strict';

function rankConsoleResults(items, query) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return items.map(item => {
    const title = item.title.toLocaleLowerCase();
    const text = `${item.title} ${item.description}`.toLocaleLowerCase();
    return { ...item, score: terms.every(term => text.includes(term))
      ? 1 + terms.filter(term => title.includes(term)).length : 0 };
  }).filter(item => item.score).sort((a, b) => b.score - a.score).slice(0, 8);
}

if (typeof module !== 'undefined') module.exports = { rankConsoleResults };

if (typeof document !== 'undefined') (() => {
  const input = document.getElementById('console-search-input');
  const form = document.getElementById('console-search-form');
  const clear = document.getElementById('console-search-clear');
  const results = document.getElementById('console-search-results');
  const list = document.getElementById('console-search-list');
  const status = document.getElementById('console-search-status');
  const clean = text => text.replace(/\s+/g, ' ').trim();
  let timer;

  function indexConsole() {
    const items = [];
    document.querySelectorAll('.tab-panel section').forEach(section => {
      const heading = section.querySelector('h2');
      const panel = section.closest('.tab-panel');
      if (!heading || !panel) return;
      items.push({ title: clean(heading.textContent),
        description: clean(section.textContent), target: heading, panel });
      section.querySelectorAll('label, button[id], .preset-card').forEach(element => {
        const target = element.tagName === 'LABEL'
          ? document.getElementById(element.htmlFor) || element.querySelector('input, select')
          : element;
        if (!target) return;
        const title = clean(element.textContent);
        if (!title) return;
        items.push({ title, description: clean(heading.textContent), target, panel });
      });
    });
    return items;
  }

  function closeResults() {
    clearTimeout(timer);
    results.hidden = true;
  }

  function search() {
    clearTimeout(timer);
    clear.hidden = !input.value;
    const query = input.value.trim();
    list.replaceChildren();
    if (!query) { closeResults(); return; }
    const matches = rankConsoleResults(indexConsole(), query);
    results.hidden = false;
    status.textContent = matches.length
      ? `${matches.length} matching destinations · select one to open`
      : 'No matches. Try yaw, speed, preset, calibration, or firmware.';
    for (const match of matches) {
      const row = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      const title = document.createElement('strong');
      title.textContent = match.title;
      const detail = document.createElement('span');
      detail.textContent = match.description.slice(0, 140);
      button.append(title, detail);
      button.onclick = () => {
        const tab = document.getElementById(match.panel.getAttribute('aria-labelledby'));
        tab.click();
        closeResults();
        // Navigation only: never click or submit the matched robot control.
        const target = match.target.disabled ? match.target.closest('section').querySelector('h2') : match.target;
        if (!target.matches('input, select, button, a[href]')) target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
        target.scrollIntoView({ block: 'center', behavior: 'instant' });
      };
      row.append(button);
      list.append(row);
    }
  }

  form.onsubmit = event => { event.preventDefault(); search(); };
  input.addEventListener('input', () => {
    clear.hidden = !input.value;
    clearTimeout(timer);
    timer = setTimeout(search, 120);
  });
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      search();
      list.querySelector('button')?.focus();
    }
  });
  results.addEventListener('keydown', event => {
    const buttons = [...list.querySelectorAll('button')];
    const index = buttons.indexOf(document.activeElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const next = index + (event.key === 'ArrowDown' ? 1 : -1);
      if (next < 0) input.focus();
      else buttons[Math.min(next, buttons.length - 1)]?.focus();
    }
  });
  input.closest('.console-search').addEventListener('keydown', event => {
    if (event.key === 'Escape') { closeResults(); input.focus(); }
  });
  clear.onclick = () => { input.value = ''; search(); input.focus(); };
  window.addEventListener('pagehide', () => clearTimeout(timer));
})();
