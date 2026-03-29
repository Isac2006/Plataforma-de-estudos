// ------------------------------
// MÓDULO - modo escuro + acessibilidade
// ------------------------------

// Seletores
const temaSelect = document.getElementById("temaSelect");
const fonteSelect = document.getElementById("fonteSelect");
const altoContrasteCheckbox = document.getElementById("altoContraste");

// Aplicar tema
function aplicarTema(tema) {
    document.body.classList.remove("tema-claro", "tema-escuro");

    if (tema === "claro") {
        document.body.classList.add("tema-claro");
    } else if (tema === "escuro") {
        document.body.classList.add("tema-escuro");
    } else { // modo automático
        const escuro = window.matchMedia("(prefers-color-scheme: dark)").matches;
        document.body.classList.add(escuro ? "tema-escuro" : "tema-claro");
    }

    localStorage.setItem("tema", tema);
}

// Aplicar tamanho de fonte
function aplicarFonte(tamanho) {
    document.body.classList.remove("fonte-pequena", "fonte-normal", "fonte-grande");
    document.body.classList.add(`fonte-${tamanho}`);
    localStorage.setItem("fonte", tamanho);
}

// Aplicar alto contraste
function aplicarAltoContraste(ativado) {
    document.body.classList.toggle("alto-contraste", ativado);
    localStorage.setItem("altoContraste", ativado ? "sim" : "nao");
}

// Inicialização
function initAparencia() {
    // Carregar preferências
    const temaSalvo = localStorage.getItem("tema") || "claro";
    const fonteSalva = localStorage.getItem("fonte") || "normal";
    const contrasteSalvo = localStorage.getItem("altoContraste") === "sim";

    // Definir valores no UI
    temaSelect.value = temaSalvo;
    fonteSelect.value = fonteSalva;
    altoContrasteCheckbox.checked = contrasteSalvo;

    // Aplicar estilos
    aplicarTema(temaSalvo);
    aplicarFonte(fonteSalva);
    aplicarAltoContraste(contrasteSalvo);

    // Eventos
    temaSelect.addEventListener("change", e => aplicarTema(e.target.value));
    fonteSelect.addEventListener("change", e => aplicarFonte(e.target.value));
    altoContrasteCheckbox.addEventListener("change", e => aplicarAltoContraste(e.target.checked));
}

document.addEventListener("DOMContentLoaded", initAparencia);

export { initAparencia };
