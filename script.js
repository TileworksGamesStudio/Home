function renderCards() {
  const grid = document.getElementById('links-grid');
  if (!grid) return;

  grid.innerHTML = '';

  const filtered = activeCategory === 'all' 
    ? allMenuItems 
    : allMenuItems.filter(item => {
        if (!item.category) return false;
        const itemCats = Array.isArray(item.category) 
          ? item.category.map(c => c.toLowerCase()) 
          : [item.category.toLowerCase()];
        return itemCats.includes(activeCategory);
      });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column: span 2; text-align:center; padding: 40px; color: var(--text-muted); font-size: 0.85rem;">No games found in this category.</div>`;
    return;
  }

  filtered.forEach((item, idx) => {
    const card = document.createElement('a');
    card.href = item.url || '#';
    card.className = 'menu-link';
    card.setAttribute('role', 'listitem');
    card.setAttribute('aria-label', item.title || 'Studio Item');
    card.style.animationDelay = `${idx * 0.07 + 0.05}s`;

    if (item.badge) {
      const badge = document.createElement('span');
      badge.className = 'card-badge';
      badge.textContent = item.badge;
      card.appendChild(badge);
    }

    const shine = document.createElement('div');
    shine.className = 'card-shine';
    card.appendChild(shine);

    const wrap = document.createElement('div');
    wrap.className = 'tile-image-wrap';

    const img = document.createElement('img');
    
    // Auto-detect whether image is in root, /Links/, or /links/
    const rawImage = item.image || '';
    img.src = rawImage.includes('/') ? rawImage : rawImage; // Start with direct filename
    img.alt = item.title || 'Game Icon';
    img.loading = idx < 4 ? 'eager' : 'lazy';

    // Smart fallback if the first path 404s
    let attempts = 0;
    img.onerror = function() {
      attempts++;
      if (attempts === 1) {
        // Try inside "Links/"
        this.src = `Links/${rawImage}`;
      } else if (attempts === 2) {
        // Try inside lowercase "links/"
        this.src = `links/${rawImage}`;
      } else {
        // If image file cannot be found, display game title instead of blank
        this.style.display = 'none';
        const fallbackText = document.createElement('span');
        fallbackText.className = 'tile-fallback-title';
        fallbackText.textContent = item.title || 'Game';
        wrap.appendChild(fallbackText);
      }
    };

    wrap.appendChild(img);
    card.appendChild(wrap);

    attachCardTiltPhysics(card);
    grid.appendChild(card);
  });
}