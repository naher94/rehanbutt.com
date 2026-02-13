///////////////////////////////////////////// Start of Share Highlighter
(function() {
  var tooltip = document.createElement('div');
  tooltip.classList.add('share-highlighter');
  tooltip.innerHTML =
    '<a class="share-highlighter-item threads" target="_blank" rel="noopener noreferrer"><i class="fa-brands fa-threads"></i></a>' +
    '<span class="share-highlighter-item copy"><i class="fas fa-link"></i></span>';
  document.body.appendChild(tooltip);

  var postContent = document.querySelector('.post-content');
  if (!postContent) return;

  var isVisible = false;

  function showTooltip(rect, selectedText) {
    var threadsLink = tooltip.querySelector('.threads');
    var pageUrl = window.location.href;
    var shareText = '"' + selectedText + '" — ' + pageUrl;
    threadsLink.href = 'https://threads.net/intent/post?text=' + encodeURIComponent(shareText);

    var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

    tooltip.style.top = (rect.top + scrollTop - 48) + 'px';
    tooltip.style.left = (rect.left + scrollLeft + (rect.width / 2)) + 'px';

    requestAnimationFrame(function() {
      tooltip.classList.add('visible');
    });
    isVisible = true;
  }

  function hideTooltip() {
    tooltip.classList.remove('visible');
    isVisible = false;
  }

  function handleCopy() {
    var selection = document.getSelection();
    var selectedText = selection.toString().trim();
    if (!selectedText) return;

    var pageUrl = window.location.href;
    var shareText = '"' + selectedText + '" — ' + pageUrl;

    if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(shareText);

      var copyItem = tooltip.querySelector('.copy');
      var copyBadge = document.createElement('span');
      copyBadge.classList.add('copied');
      copyBadge.innerText = 'Copied!';
      copyItem.appendChild(copyBadge);

      requestAnimationFrame(function() {
        requestAnimationFrame(function() { copyBadge.classList.add('visible'); });
      });
      setTimeout(function() { copyBadge.classList.remove('visible'); }, 1500);
      setTimeout(function() { copyBadge.remove(); }, 1900);
    }
  }

  tooltip.querySelector('.copy').addEventListener('click', handleCopy);

  // Prevent tooltip click from clearing the selection
  tooltip.addEventListener('mousedown', function(e) {
    e.preventDefault();
  });

  postContent.addEventListener('pointerup', function() {
    setTimeout(function() {
      var selection = document.getSelection();
      var selectedText = selection.toString().trim();

      if (selectedText.length > 0) {
        var range = selection.getRangeAt(0);
        var rect = range.getBoundingClientRect();
        showTooltip(rect, selectedText);
      } else {
        hideTooltip();
      }
    }, 10);
  });

  document.addEventListener('pointerdown', function(e) {
    if (isVisible && !tooltip.contains(e.target)) {
      hideTooltip();
    }
  });
})();
///////////////////////////////////////////// End of Share Highlighter
