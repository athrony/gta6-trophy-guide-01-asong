const STORAGE_KEY = 'leonida-trophy-tracker-v1';
const list = document.querySelector('#trophy-list');
const search = document.querySelector('#search');
const sort = document.querySelector('#sort');
const spoilerToggle = document.querySelector('#spoilers');
const message = document.querySelector('#message');
let trophies = [];
let earned = new Set();
let filter = 'all';
let selectedId = 1;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  earned = new Set(Array.isArray(saved.earned) ? saved.earned : []);
  if (typeof saved.hideSpoilers === 'boolean') spoilerToggle.checked = saved.hideSpoilers;
} catch {
  message.textContent = 'Saved progress could not be read. You can import a backup.';
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned], hideSpoilers: spoilerToggle.checked }));
  } catch {
    message.textContent = 'Progress could not be saved on this device. Export a backup to keep it.';
  }
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function render() {
  const validIds = new Set(trophies.map(trophy => trophy.id));
  const earnedCount = [...earned].filter(id => validIds.has(id)).length;
  document.querySelector('#earned').textContent = earnedCount;
  document.querySelector('#progress-bar').style.width = `${earnedCount / trophies.length * 100}%`;
  const counts = document.querySelector('#grade-counts');
  counts.replaceChildren();
  for (const grade of ['platinum', 'gold', 'silver', 'bronze']) {
    const matching = trophies.filter(trophy => trophy.grade === grade);
    const count = matching.filter(trophy => earned.has(trophy.id)).length;
    const item = element('div', 'grade-stat');
    item.append(element('span', `medal ${grade}`), element('strong', '', `${count}/${matching.length}`), element('small', '', grade));
    counts.append(item);
  }
  const query = search.value.trim().toLowerCase();
  const visible = trophies.filter(trophy => {
    const hidden = spoilerToggle.checked && trophy.hidden && !earned.has(trophy.id);
    const matchesFilter = filter === 'all' || (filter === 'missable' ? trophy.missable : trophy.kind === filter);
    const searchable = hidden ? 'hidden trophy' : `${trophy.name} ${trophy.description} ${trophy.guide}`.toLowerCase();
    return matchesFilter && searchable.includes(query);
  });
  if (sort.value === 'name') visible.sort((first, second) => {
    const firstHidden = spoilerToggle.checked && first.hidden && !earned.has(first.id);
    const secondHidden = spoilerToggle.checked && second.hidden && !earned.has(second.id);
    return (firstHidden ? '' : first.name).localeCompare(secondHidden ? '' : second.name);
  });
  if (sort.value === 'grade') {
    const grades = ['platinum', 'gold', 'silver', 'bronze'];
    visible.sort((first, second) => grades.indexOf(first.grade) - grades.indexOf(second.grade));
  }
  if (sort.value === 'progress') visible.sort((first, second) => Number(earned.has(first.id)) - Number(earned.has(second.id)));
  document.querySelector('#result-count').textContent = `${visible.length} ${visible.length === 1 ? 'TROPHY' : 'TROPHIES'} SHOWN`;
  list.replaceChildren();
  if (!visible.length) {
    list.append(element('div', 'empty', filter === 'missable' ? 'No potentially missable trophies match your search.' : 'No trophies match your search.'));
    document.querySelector('#trophy-detail').replaceChildren();
    return;
  }
  if (!visible.some(trophy => trophy.id === selectedId)) selectedId = visible[0].id;
  for (const trophy of visible) {
    const isEarned = earned.has(trophy.id);
    const hidden = spoilerToggle.checked && trophy.hidden && !isEarned;
    const row = element('article', `trophy kind-${trophy.kind} ${isEarned ? 'is-earned' : ''} ${selectedId === trophy.id ? 'is-selected' : ''}`);
    const check = element('label', 'check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isEarned;
    input.setAttribute('aria-label', hidden ? 'Mark hidden trophy earned' : `Mark ${trophy.name} earned`);
    input.addEventListener('change', () => { input.checked ? earned.add(trophy.id) : earned.delete(trophy.id); save(); render(); });
    check.append(input, element('span', 'checkmark', '✓'));
    const icon = element('div', `trophy-icon ${trophy.grade}`);
    icon.append(element('span', 'cup'));
    const content = element('button', 'row-select');
    content.type = 'button';
    content.setAttribute('aria-pressed', String(selectedId === trophy.id));
    content.append(element('h3', '', hidden ? 'Hidden trophy' : trophy.name), element('p', 'description', hidden ? 'Earn this trophy to reveal its details.' : trophy.description));
    content.addEventListener('click', () => { selectedId = trophy.id; render(); document.querySelector('.is-selected .row-select')?.focus(); });
    row.append(check, icon, content, element('div', 'grade-label', trophy.grade));
    list.append(row);
  }
  const selected = visible.find(trophy => trophy.id === selectedId);
  const hidden = spoilerToggle.checked && selected.hidden && !earned.has(selected.id);
  const detail = document.querySelector('#trophy-detail');
  detail.replaceChildren();
  const detailArt = element('div', `detail-art kind-${selected.kind}`);
  const detailCup = element('div', `detail-cup ${selected.grade}`);
  detailCup.append(element('span', 'cup'));
  detailArt.append(detailCup);
  detail.append(detailArt, element('div', 'detail-grade', `${selected.grade} trophy`), element('h2', '', hidden ? 'Hidden trophy' : selected.name), element('p', 'detail-description', hidden ? 'Earn this trophy to reveal its details.' : selected.description), element('p', 'detail-status', earned.has(selected.id) ? 'EARNED' : 'NOT YET EARNED'));
  if (!hidden) {
    const details = document.createElement('details');
    details.open = true;
    const summary = element('summary', '', 'GUIDE & SOURCES');
    const guide = element('div', 'guide');
    guide.append(element('p', '', selected.guide));
    const sources = element('p', 'source', 'SOURCES  ·  ');
    selected.sources.forEach((source, index) => {
      if (index) sources.append(document.createTextNode('  ·  '));
      const link = element('a', '', source.name);
      link.href = source.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      sources.append(link);
    });
    guide.append(sources, element('p', 'source', `MISSABILITY  ·  ${selected.missableStatus}`));
    details.append(summary, guide);
    detail.append(details);
  }

}

document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => {
  filter = button.dataset.filter;
  document.querySelectorAll('[data-filter]').forEach(item => item.classList.toggle('selected', item === button));
  render();
}));
search.addEventListener('input', render);
sort.addEventListener('change', render);
spoilerToggle.addEventListener('change', () => { save(); render(); });
document.querySelector('#export').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, earned: [...earned], hideSpoilers: spoilerToggle.checked }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  message.textContent = 'Progress exported.';
});
document.querySelector('#import-button').addEventListener('click', () => document.querySelector('#import-file').click());
document.querySelector('#import-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const validIds = new Set(trophies.map(trophy => trophy.id));
    if (data.version !== 1 || !Array.isArray(data.earned) || !data.earned.every(id => Number.isInteger(id) && validIds.has(id)) || (data.hideSpoilers !== undefined && typeof data.hideSpoilers !== 'boolean')) throw new Error('Invalid save');
    earned = new Set(data.earned);
    if (typeof data.hideSpoilers === 'boolean') spoilerToggle.checked = data.hideSpoilers;
    save();
    render();
    message.textContent = 'Progress imported successfully.';
  } catch {
    message.textContent = 'Could not import that file. Choose a valid Leonida progress backup.';
  }
  event.target.value = '';
});
fetch('data/trophies.json').then(response => {
  if (!response.ok) throw new Error('Trophy data unavailable');
  return response.json();
}).then(data => { trophies = data.trophies || data; render(); }).catch(() => {
  list.append(element('div', 'empty', 'Trophy data could not be loaded. Open this guide using the local preview server.'));
});
