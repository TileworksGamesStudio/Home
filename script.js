async function renderMenuLinks() {
  const gridContainer = document.getElementById('links-grid');

  try {
    const response = await fetch('links.json');
    if (!response.ok) throw new Error('Failed to load links.json');
    
    const menuItems = await response.json();
    gridContainer.innerHTML = '';

    menuItems.forEach(item => {
      const linkElement = document.createElement('a');
      linkElement.href = item.url;
      linkElement.className = 'menu-link';

      const imgElement = document.createElement('img');
      imgElement.src = `Links/${item.image}`;
      imgElement.alt = item.image.replace('.svg', '');
      imgElement.loading = 'lazy';

      linkElement.appendChild(imgElement);
      gridContainer.appendChild(linkElement);
    });

  } catch (error) {
    console.error('Error rendering menu:', error);
  }
}

document.addEventListener('DOMContentLoaded', renderMenuLinks);
