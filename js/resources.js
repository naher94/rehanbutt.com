let hrefs; // Declare in the outer scope
let randomHref;

document.addEventListener('DOMContentLoaded', () => {
  const tagsContainer = document.querySelector('.tags-container');
  if (tagsContainer) {
    const links = tagsContainer.querySelectorAll('a');
    hrefs = Array.from(links).map(link => link.href);
  }
  // Randomly select an index
  const randomIndex = Math.floor(Math.random() * hrefs.length);

  // Get the randomly selected href
  randomHref = hrefs[randomIndex];

  // Trim everything before the '#' in randomHref
  randomHref = randomHref.split('#')[1] ? `#${randomHref.split('#')[1]}` : '';

  // Select the <a> tag with the class 'resource-surprise-me-button'
  const linkElement = document.querySelector('.resource-surprise-me-button');

  // Check if the element exists
  if (linkElement) {
    // Replace the href attribute
    linkElement.href = randomHref;
  }
});