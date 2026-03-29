// src/gridMaterias.js

const API_BASE = "http://localhost:3000";

async function apiFetch(endpoint, options = {}) {
    const response = await fetch(`${API_BASE}${endpoint}`, options);

    const contentType = response.headers.get("content-type");

    if (!response.ok) {
        throw new Error(`Erro ${response.status}`);
    }

    if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        throw new Error("Servidor retornou HTML:\n" + text.slice(0, 200));
    }

    return response.json();
}

/* ==========================================
   GRID DE DISCIPLINAS
========================================== */

const gridMaterias = document.getElementById("grid-materias");

const cores = {
    matematica: "#1E3A8A",
    portugues: "#BE185D",
    historia: "#9A3412",
    geografia: "#065F46",
    ciencias: "#0C4A6E",
    fisica: "#5B21B6",
    quimica: "#B91C1C",
    biologia: "#166534",
    filosofia: "#312E81",
    sociologia: "#334155"
};

let todasDisciplinas = [];

export async function carregarGridMaterias() {

    if (!gridMaterias) return;

    try {

        const disciplinas = await apiFetch("/disciplinas");

        todasDisciplinas = disciplinas;

        renderizarDisciplinas(disciplinas);

    } catch (e) {

        console.error("Erro ao carregar disciplinas:", e);

        gridMaterias.innerHTML = "<p>Erro ao carregar disciplinas.</p>";

    }

}

export function iniciarGridMaterias(){
    carregarGridMaterias();
}

function renderizarDisciplinas(lista) {

    gridMaterias.innerHTML = "";

    if (!lista.length) {

        gridMaterias.innerHTML = "<p>Nenhuma disciplina encontrada.</p>";
        return;

    }

    lista.forEach(disciplina => {

        const card = document.createElement("div");

        card.className = "card-materia";

        const cor = cores[normalizarTexto(disciplina)] || "#334155";

        card.style.background = cor;

        card.innerHTML = `
            <div class="badge">Disciplina</div>
            <h3>${capitalizar(disciplina)}</h3>
            <span>Clique para explorar a disciplina</span>
        `;

        card.addEventListener("click", () => {

            const disciplinaNormalizada = normalizarTexto(disciplina);

            window.location.href =
                `modulos.html?disciplina=${encodeURIComponent(disciplinaNormalizada)}`;

        });

        gridMaterias.appendChild(card);

    });

}

function capitalizar(txt) {
    if (!txt || typeof txt !== "string") return "";
    return txt.charAt(0).toUpperCase() + txt.slice(1);
}

function normalizarTexto(texto) {
    return texto
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}