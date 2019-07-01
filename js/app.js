$(document).foundation();

(function(){
    var burger = document.querySelector('.menu'),
        header = document.querySelector('.mobile-navbar-full');
    
    burger.onclick = function() {
      header.classList.toggle('.menu-hide');
//      remove display inline-block from nav-item-container
//      remove display none .mobile-navbar
    }
}());