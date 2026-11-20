const STORAGE_KEY = 'leonida-trophy-tracker-v1';
const list = document.querySelector('#trophy-list');
const search = document.querySelector('#search');
const sort = document.querySelector('#sort');
const spoilerToggle = document.querySelector('#spoilers');
const message = document.querySelector('#message');
let trophies = [];
let guides = {};
let earned = new Set();
let filter = 'all';
let selectedId = 1;

try {
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  earned = new Set(Array.isArray(saved.earned) ? saved.earned : []);
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


function iconPath(trophy) {
  return `assets/trophy-icons/${String(trophy.id).padStart(2, '0')}.jpg`;
}

function trophyImage(trophy, className) {
  const img = document.createElement('img');
  if (className) img.className = className;
  img.src = iconPath(trophy);
  img.alt = trophy.name;
  img.width = 512;
  img.height = 512;
  img.decoding = 'async';
  img.draggable = false;
  return img;
}

function sourceLink(source, text, className) {
  const link = element('a', className, text);
  link.href = source.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  return link;
}

function renderGuide(trophy) {
  const guide = element('div', 'guide');
  const data = guides[trophy.id];
  if (data) {
    guide.append(element('p', 'guide-summary', data.summary));
    guide.append(element('h3', '', 'When'), element('p', '', data.when));
    if (data.prerequisites?.length) {
      guide.append(element('h3', '', 'Prerequisites'));
      const prerequisites = element('ul', 'guide-prerequisites');
      data.prerequisites.forEach(text => prerequisites.append(element('li', '', text)));
      guide.append(prerequisites);
    }
    guide.append(element('h3', '', 'Steps'));
    const steps = element('ol', 'guide-steps');
    data.steps.forEach(step => {
      const item = element('li', '', step.text);
      const source = data.sources[step.source];
      const citation = sourceLink(source, `[${step.source + 1}]`, 'guide-citation');
      citation.setAttribute('aria-label', `Source ${step.source + 1}, ${source.name}`);
      citation.title = source.name;
      item.append(document.createTextNode(' '), citation);
      steps.append(item);
    });
    guide.append(steps, element('h3', '', 'Missability'));
    const missability = element('p', 'guide-missability');
    missability.append(element('strong', '', data.missable.status), document.createTextNode(` — ${data.missable.note}`));
    guide.append(missability);
    if (data.effort) guide.append(element('h3', '', 'Effort'), element('p', '', data.effort));
  } else {
    guide.append(element('p', '', trophy.guide), element('p', 'source', `MISSABILITY · ${trophy.missableStatus}`));
  }
  guide.append(element('h3', '', 'Sources'));
  const sources = element('ol', 'guide-sources');
  (data?.sources || trophy.sources).forEach(source => {
    const item = element('li');
    item.append(sourceLink(source, source.name));
    sources.append(item);
  });
  guide.append(sources);
  return guide;
}

function renderRoadmap() {
  document.querySelectorAll('.stages article').forEach((stage, index) => {
    const stageTrophies = trophies.filter(trophy => trophy.roadmapStage === index + 1 && !(spoilerToggle.checked && trophy.hidden && !earned.has(trophy.id)));
    let details = stage.querySelector('details');
    if (!details) {
      details = element('details', 'stage-trophies');
      stage.append(details);
    }
    const wasOpen = details.open;
    details.replaceChildren(element('summary', '', `${stageTrophies.length} trophies`));
    const links = element('ul');
    stageTrophies.forEach(trophy => {
      const item = element('li');
      const button = element('button', '', `${earned.has(trophy.id) ? '✓ ' : ''}${trophy.name}`);
      button.type = 'button';
      button.addEventListener('click', () => {
        selectedId = trophy.id;
        search.value = '';
        filter = 'all';
        document.querySelectorAll('[data-filter]').forEach(button => button.classList.toggle('selected', button.dataset.filter === 'all'));
        render();
        const selectedRow = document.querySelector('.is-selected .row-select');
        selectedRow?.focus({ preventScroll: true });
        selectedRow?.scrollIntoView({ block: 'nearest' });
      });
      item.append(button);
      links.append(item);
    });
    details.append(links);
    details.open = wasOpen;
  });
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
  renderRoadmap();
  const query = search.value.trim().toLowerCase();
  const visible = trophies.filter(trophy => {
    if (spoilerToggle.checked && trophy.hidden && !earned.has(trophy.id)) return false;
    const matchesFilter = filter === 'all' || (filter === 'missable' ? trophy.missable : trophy.kind === filter);
    const guide = guides[trophy.id];
    const searchable = `${trophy.name} ${trophy.description} ${trophy.guide} ${guide?.summary || ''} ${guide?.when || ''} ${(guide?.prerequisites || []).join(' ')} ${(guide?.steps || []).map(step => step.text).join(' ')}`.toLowerCase();
    return matchesFilter && searchable.includes(query);
  });
  if (sort.value === 'name') visible.sort((first, second) => first.name.localeCompare(second.name));
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
    const row = element('article', `trophy kind-${trophy.kind} ${isEarned ? 'is-earned' : ''} ${selectedId === trophy.id ? 'is-selected' : ''}`);
    const check = element('label', 'check');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = isEarned;
    input.setAttribute('aria-label', `Mark ${trophy.name} earned`);
    input.addEventListener('change', () => { input.checked ? earned.add(trophy.id) : earned.delete(trophy.id); save(); render(); });
    check.append(input, element('span', 'checkmark', '✓'));
    const icon = element('div', `trophy-icon ${trophy.grade}`);
    icon.append(trophyImage(trophy), element('span', 'cup'));
    const content = element('button', 'row-select');
    content.type = 'button';
    content.setAttribute('aria-pressed', String(selectedId === trophy.id));
    content.append(element('h3', '', trophy.name), element('p', 'description', trophy.description));
    content.addEventListener('click', () => { selectedId = trophy.id; render(); document.querySelector('.is-selected .row-select')?.focus(); });
    const grade = element('div', 'grade-label', trophy.grade);
    if (trophy.hidden) grade.append(element('span', 'hidden-badge', 'Hidden'));
    row.append(check, icon, content, grade);
    list.append(row);
  }
  const selected = visible.find(trophy => trophy.id === selectedId);
  const detail = document.querySelector('#trophy-detail');
  detail.replaceChildren();
  const detailArt = element('div', `detail-art kind-${selected.kind}`);
  const detailCup = element('div', `detail-cup ${selected.grade}`);
  detailCup.append(element('span', 'cup'));
  detailArt.append(trophyImage(selected, 'detail-icon'), detailCup);
  const rarity = typeof selected.rarityPercent === 'number'
    ? `EXOPHASE RARITY  ·  ${selected.rarityPercent}% (fetched 2026-11-20, early/volatile)`
    : '';
  detail.append(
    detailArt,
    element('div', 'detail-grade', `${selected.grade} trophy`),
    element('h2', '', selected.name),
    element('p', 'detail-description', selected.description),
    element('p', 'detail-status', earned.has(selected.id) ? 'EARNED' : 'NOT YET EARNED'),
  );
  if (rarity) detail.append(element('p', 'detail-rarity', rarity));
  const details = document.createElement('details');
  details.open = true;
  const summary = element('summary', '', 'GUIDE & SOURCES');
  details.append(summary, renderGuide(selected));
  detail.append(details);

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
Promise.all([
  fetch('data/trophies.json').then(response => {
    if (!response.ok) throw new Error('Trophy data unavailable');
    return response.json();
  }),
  fetch('data/guides.json').then(response => {
    if (!response.ok) throw new Error('Guide data unavailable');
    return response.json();
  }).catch(() => ({})),
]).then(([data, guideData]) => {
  trophies = data.trophies || data;
  guides = guideData;
  render();
}).catch(() => {
  list.append(element('div', 'empty', 'Trophy data could not be loaded. Open this guide using the local preview server.'));
});
