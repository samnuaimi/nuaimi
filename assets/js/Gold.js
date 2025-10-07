var h1 = document.querySelector("Gold");

h1.addEventListener("input", function() {
    this.setAttribute("data-heading", this.innerText);
});

 window.addEventListener('keydown',function(e) {
        if (e.keyIdentifier=='U+000A' || e.keyIdentifier=='Enter' || e.keyCode==13) {
                e.preventDefault();
                return false;
        }
}, true);