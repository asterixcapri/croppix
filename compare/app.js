import { cases, engines, formats } from './config.js';

const board = document.getElementById('board');
const cacheTokenInput = document.getElementById('cacheToken');
const filterInput = document.getElementById('filterInput');
const refreshButton = document.getElementById('refreshButton');
const caseTemplate = document.getElementById('caseTemplate');
const formatTemplate = document.getElementById('formatTemplate');
const engineTemplate = document.getElementById('engineTemplate');

let currentFilter = '';

refreshButton.addEventListener('click', render);
filterInput.addEventListener('input', () => {
  currentFilter = filterInput.value.trim().toLowerCase();
  render();
});

render();

function render() {
  const cacheToken = sanitizeToken(cacheTokenInput.value);
  board.innerHTML = '';

  const visibleCases = cases.filter((item) => {
    if (!currentFilter) {
      return true;
    }

    const haystack = `${item.title} ${item.type} ${item.path} ${item.notes}`.toLowerCase();
    return haystack.includes(currentFilter);
  });

  for (const item of visibleCases) {
    const fragment = caseTemplate.content.cloneNode(true);
    fragment.querySelector('.case-type').textContent = item.type;
    fragment.querySelector('.case-title').textContent = item.title;
    fragment.querySelector('.case-path').textContent = item.path;
    fragment.querySelector('.case-notes').textContent = item.notes;

    const formatStack = fragment.querySelector('.format-stack');

    for (const format of formats) {
      const formatFragment = formatTemplate.content.cloneNode(true);
      formatFragment.querySelector('.format-title').textContent = format.label;
      formatFragment.querySelector('.format-size').textContent = `${format.width} x ${format.height}`;

      const grid = formatFragment.querySelector('.engine-grid');

      for (const engine of engines) {
        const engineFragment = engineTemplate.content.cloneNode(true);
        const imageUrl = buildImageUrl(engine.baseUrl, item.path, format, cacheToken, engine.key);
        const image = engineFragment.querySelector('.engine-image');
        const link = engineFragment.querySelector('.engine-link');

        engineFragment.querySelector('.engine-name').textContent = engine.label;
        image.src = imageUrl;
        image.alt = `${item.title} ${format.label} rendered by ${engine.label}`;
        image.style.setProperty('--aspect-ratio', `${format.width} / ${format.height}`);
        link.href = imageUrl;

        grid.appendChild(engineFragment);
      }

      formatStack.appendChild(formatFragment);
    }

    board.appendChild(fragment);
  }

  if (visibleCases.length === 0) {
    board.innerHTML = '<article class="case-card"><h3>No matching cases</h3><p class="case-notes">Adjust the filter or add more entries in compare/config.js.</p></article>';
  }
}

function buildImageUrl(baseUrl, imagePath, format, cacheToken, engineKey) {
  return `${baseUrl}/${imagePath}/w${format.width}_h${format.height}_csmart_u${cacheToken}-${format.key}-${engineKey}.webp`;
}

function sanitizeToken(value) {
  const token = value.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  return token || 'cmp001';
}
