document.addEventListener("DOMContentLoaded", () => {
    const btnMenu = document.getElementById("btn-menu");
    const sidebar = document.querySelector(".sidebar");
    const overlay = document.getElementById("overlay");

    if (btnMenu && sidebar) {
        btnMenu.addEventListener("click", () => {
            sidebar.classList.toggle("ativo");
            btnMenu.classList.toggle("ativo");
            document.body.classList.toggle("menu-aberto");

            if (overlay) overlay.classList.toggle("ativo");
        });
    }

    if (overlay && sidebar) {
        overlay.addEventListener("click", () => {
            sidebar.classList.remove("ativo");
            btnMenu?.classList.remove("ativo");
            overlay.classList.remove("ativo");
            document.body.classList.remove("menu-aberto");
        });
    }
});