document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.querySelector('.resource-search');
  const filterToggle = document.querySelector('.resource-filter-toggle');
  const filterPanel = document.getElementById('resource-filter-panel');
  const filterCount = document.querySelector('.filter-count');
  const clearAllBtn = document.querySelector('.filter-clear-all');
  const surpriseBtn = document.querySelector('.resource-surprise-me-button');
  const typeBtns = document.querySelectorAll('.filter-type-btn');
  const tagBtns = document.querySelectorAll('.filter-tag-btn');
  const cards = document.querySelectorAll('.resource-grid .resource-link');
  const tagDividers = document.querySelectorAll('.resource-tag-divider');
  const noResults = document.querySelector('.resource-no-results');

  let searchQuery = '';
  let activeTypes = new Set();
  let activeTags = new Set();
  let debounceTimer;

  // --- Filter ---

  function isFiltering() {
    return searchQuery !== '' || activeTypes.size > 0 || activeTags.size > 0;
  }

  function filterCards() {
    const filtering = isFiltering();

    if (!filtering) {
      // Browse mode: show everything
      cards.forEach(card => card.classList.remove('is-hidden'));
      tagDividers.forEach(d => d.classList.remove('is-hidden'));
      noResults.hidden = true;
      updateBadge();
      updateClearAll();
      return;
    }

    // Build active type values
    const activeTypeValues = new Set();
    typeBtns.forEach(btn => {
      if (btn.classList.contains('active')) {
        btn.dataset.types.split(',').forEach(t => activeTypeValues.add(t.trim().toLowerCase()));
      }
    });

    // Show/hide each card, deduplicate by href across tag sections
    const seenHrefs = new Set();
    let visibleCount = 0;

    cards.forEach(card => {
      const cardType  = (card.dataset.type  || '').toLowerCase().trim();
      const cardTags  = (card.dataset.tags  || '').split(',').map(t => t.trim()).filter(Boolean);
      const cardTitle = card.dataset.title  || '';
      const cardDesc  = card.dataset.description || '';

      const searchMatch = searchQuery === '' ||
        cardTitle.includes(searchQuery) ||
        cardDesc.includes(searchQuery);

      const typeMatch = activeTypeValues.size === 0 ||
        activeTypeValues.has(cardType);

      const tagMatch = activeTags.size === 0 ||
        cardTags.some(t => activeTags.has(t));

      const passes = searchMatch && typeMatch && tagMatch;
      const isDuplicate = passes && seenHrefs.has(card.href);
      const visible = passes && !isDuplicate;

      if (passes && !isDuplicate) seenHrefs.add(card.href);

      card.classList.toggle('is-hidden', !visible);
      if (visible) visibleCount++;
    });

    // Hide tag section dividers whose entire section has no visible cards.
    // Walk siblings: after each divider, collect cards until the next divider.
    tagDividers.forEach(divider => {
      let el = divider.nextElementSibling;
      let sectionHasVisible = false;
      while (el && !el.classList.contains('resource-tag-divider')) {
        if (el.classList.contains('resource-link') && !el.classList.contains('is-hidden')) {
          sectionHasVisible = true;
          break;
        }
        el = el.nextElementSibling;
      }
      divider.classList.toggle('is-hidden', !sectionHasVisible);
    });

    noResults.hidden = visibleCount > 0;
    updateBadge();
    updateClearAll();
  }

  function updateBadge() {
    const total = activeTypes.size + activeTags.size;
    filterCount.textContent = total;
    filterCount.hidden = total === 0;
    filterToggle.classList.toggle('has-active-filters', total > 0);
  }

  function updateClearAll() {
    clearAllBtn.hidden = activeTypes.size === 0 && activeTags.size === 0 && searchQuery === '';
  }

  function clearFilters() {
    searchInput.value = '';
    searchQuery = '';
    activeTypes.clear();
    activeTags.clear();
    typeBtns.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    tagBtns.forEach(btn => {
      btn.classList.remove('active');
      btn.setAttribute('aria-pressed', 'false');
    });
    filterCards();
  }

  // --- Search ---

  searchInput.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      searchQuery = searchInput.value.toLowerCase().trim();
      filterCards();
    }, 150);
  });

  // --- Type buttons ---

  typeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const isActive = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        activeTypes.add(btn.dataset.types);
      } else {
        activeTypes.delete(btn.dataset.types);
      }
      filterCards();
    });
  });

  // --- Tag buttons ---

  tagBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tag = btn.dataset.tag.toLowerCase();
      const isActive = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        activeTags.add(tag);
      } else {
        activeTags.delete(tag);
      }
      filterCards();
    });
  });

  // --- Clear all ---

  clearAllBtn.addEventListener('click', clearFilters);

  // --- Filter panel open/close ---

  function openPanel() {
    filterPanel.hidden = false;
    filterToggle.setAttribute('aria-expanded', 'true');
  }

  function closePanel() {
    filterPanel.hidden = true;
    filterToggle.setAttribute('aria-expanded', 'false');
  }

  filterToggle.addEventListener('click', e => {
    e.stopPropagation();
    filterPanel.hidden ? openPanel() : closePanel();
  });

  document.addEventListener('click', e => {
    if (!filterPanel.hidden && !filterPanel.contains(e.target) && e.target !== filterToggle) {
      closePanel();
    }
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !filterPanel.hidden) {
      closePanel();
      filterToggle.focus();
    }
  });

  // --- Surprise me ---

  surpriseBtn.addEventListener('click', () => {
    const tagBtnArray = Array.from(tagBtns);
    if (!tagBtnArray.length) return;
    clearFilters();
    const randomBtn = tagBtnArray[Math.floor(Math.random() * tagBtnArray.length)];
    randomBtn.click();
  });
});
