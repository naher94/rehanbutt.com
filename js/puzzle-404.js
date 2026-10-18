/**
 * 404 Sliding Tile Puzzle
 *
 * Picks a random photography set, cuts its hero image into a 3x3 board and
 * lets the visitor slide the tiles back together. Solving it reveals the
 * missing piece and a link to the set.
 */
(function () {
  'use strict';

  var SIZE = 3;
  var COUNT = SIZE * SIZE;
  var MISSING = COUNT - 1;
  var SCRAMBLE_MOVES = 120;

  var board = document.getElementById('puzzle-404-board');
  var dataEl = document.getElementById('puzzle-404-photos');
  var link = document.getElementById('puzzle-404-link');
  var placeName = document.getElementById('puzzle-404-place');
  var status = document.getElementById('puzzle-404-status');
  if (!board || !dataEl) return;

  // The data is built from our own front matter, but it is read back out of the DOM, so only same-site paths are trusted.
  function isSitePath(path) {
    return typeof path === 'string' && /^\/(?!\/)/.test(path);
  }

  var photos = JSON.parse(dataEl.textContent).filter(function (entry) {
    return isSitePath(entry.url) && isSitePath(entry.image);
  });
  if (!photos.length) return;
  var photo = photos[Math.floor(Math.random() * photos.length)];
  placeName.textContent = photo.title;
  link.href = photo.url;

  var slots = [];
  var tiles = [];
  var solved = false;

  function row(slot) { return Math.floor(slot / SIZE); }
  function col(slot) { return slot % SIZE; }

  function neighbors(slot) {
    var out = [];
    if (row(slot) > 0) out.push(slot - SIZE);
    if (row(slot) < SIZE - 1) out.push(slot + SIZE);
    if (col(slot) > 0) out.push(slot - 1);
    if (col(slot) < SIZE - 1) out.push(slot + 1);
    return out;
  }

  function emptySlot() { return slots.indexOf(MISSING); }

  function isSolved() {
    for (var i = 0; i < COUNT; i++) {
      if (slots[i] !== i) return false;
    }
    return true;
  }

  // Scramble with legal moves from the solved board so every puzzle can be solved.
  function scramble() {
    do {
      slots = [];
      for (var i = 0; i < COUNT; i++) slots.push(i);
      var empty = MISSING;
      var previous = -1;
      for (var m = 0; m < SCRAMBLE_MOVES; m++) {
        var options = neighbors(empty).filter(function (s) { return s !== previous; });
        var next = options[Math.floor(Math.random() * options.length)];
        slots[empty] = slots[next];
        slots[next] = MISSING;
        previous = empty;
        empty = next;
      }
    } while (isSolved());
  }

  function positionTiles() {
    slots.forEach(function (tile, slot) {
      tiles[tile].style.setProperty('--row', row(slot));
      tiles[tile].style.setProperty('--col', col(slot));
    });
  }

  function move(slot) {
    var empty = emptySlot();
    if (solved || neighbors(empty).indexOf(slot) < 0) return null;
    var tile = slots[slot];
    slots[empty] = tile;
    slots[slot] = MISSING;
    positionTiles();
    if (isSolved()) solve();
    return tiles[tile];
  }

  function solve() {
    solved = true;
    board.classList.add('is-solved');
    tiles.forEach(function (tile) { tile.tabIndex = -1; });
    link.hidden = false;
    link.classList.add('is-revealed');
    status.textContent = 'Puzzle solved. Welcome to ' + photo.title + '.';
    lostAndFound();
  }

  // The arrow shows which way a tile slides, so Up moves the tile below the gap.
  var ARROWS = {
    ArrowUp: SIZE,
    ArrowDown: -SIZE,
    ArrowLeft: 1,
    ArrowRight: -1
  };

  board.addEventListener('keydown', function (event) {
    if (!(event.key in ARROWS)) return;
    event.preventDefault();
    var empty = emptySlot();
    var target = empty + ARROWS[event.key];
    var sideways = Math.abs(ARROWS[event.key]) === 1;
    if (target < 0 || target >= COUNT) return;
    if (sideways && row(target) !== row(empty)) return;
    var moved = move(target);
    if (moved) moved.focus();
  });

  // Cover-crop the photo to the square board, then slice it into tiles. Sizes are in tile units.
  function build(aspect) {
    var wide = Math.max(aspect, 1) * SIZE;
    var tall = Math.max(1 / aspect, 1) * SIZE;
    board.style.setProperty('--puzzle-photo', 'url("' + photo.image + '")');
    board.setAttribute('aria-describedby', 'puzzle-404-status');

    for (var tile = 0; tile < COUNT; tile++) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'puzzle-404-tile';
      var c = col(tile);
      var r = row(tile);
      button.style.setProperty('--size', wide * 100 + '% ' + tall * 100 + '%');
      button.style.setProperty('--pos', ((wide - SIZE) / 2 + c) / (wide - 1) * 100 + '% ' + ((tall - SIZE) / 2 + r) / (tall - 1) * 100 + '%');
      if (tile === MISSING) {
        button.classList.add('is-missing');
        button.tabIndex = -1;
        button.setAttribute('aria-hidden', 'true');
      } else {
        button.setAttribute('aria-label', 'Tile ' + (tile + 1));
        button.addEventListener('click', onTileClick);
      }
      board.appendChild(button);
      tiles.push(button);
    }

    scramble();
    positionTiles();
    board.hidden = false;
  }

  function onTileClick(event) {
    move(slots.indexOf(tiles.indexOf(event.currentTarget)));
  }

  var image = new Image();
  image.onload = function () { build(image.naturalWidth / image.naturalHeight); };
  image.src = photo.image;
})();
