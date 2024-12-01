let hrefs; // Declare in the outer scope
let randomHref;

document.addEventListener('DOMContentLoaded', () => {
  const tagsContainer = document.querySelector('.tags-container');
  
  // Populate hrefs when the page loads
  if (tagsContainer) {
    const links = tagsContainer.querySelectorAll('a');
    hrefs = Array.from(links).map(link => link.href);
  }

  const linkElement = document.querySelector('.resource-surprise-me-button');
  
  if (linkElement) {
    // Define the function to update the link
    const updateRandomLink = () => {
      const randomIndex = Math.floor(Math.random() * hrefs.length);
      randomHref = hrefs[randomIndex];
      randomHref = randomHref.split('#')[1] ? `#${randomHref.split('#')[1]}` : '';
      linkElement.href = randomHref; // Update the link's href
    };

    // Run the function once on page load to populate the link
    updateRandomLink();

    // Listen for click events on the link
    linkElement.addEventListener('click', (event) => {
      setTimeout(() => {
        updateRandomLink(); // Update the link after the delay
      }, 1000);
    });
  }
});
