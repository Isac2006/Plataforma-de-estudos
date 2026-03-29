// src/listaMaterias.js

const API_BASE = "http://localhost:3000";

const inputBusca = document.getElementById("busca-materia-lista");
const listaMaterias = document.getElementById("listaMateriasCadastradas");

let todasMaterias = [];

async function apiFetch(endpoint) {

    const response = await fetch(`${API_BASE}${endpoint}`);

    if (!response.ok) {
        throw new Error("Erro ao buscar dados");
    }

    return response.json();
}

/* ==========================================
   CARREGAR MATÉRIAS
========================================== */

export async function carregarListaMaterias() {

    if (!listaMaterias) return;

    try {

        const materias = await apiFetch("/materias");

        todasMaterias = materias;

        renderizarListaMaterias(materias);

    } catch (e) {

        console.error("Erro ao carregar matérias:", e);

        listaMaterias.innerHTML = "<p>Erro ao carregar matérias.</p>";

    }

}

export function iniciarListaMaterias(){

    carregarListaMaterias();

    if (inputBusca) {

        inputBusca.addEventListener("input", () => {

            const valor = inputBusca.value.toLowerCase();

            const filtradas = todasMaterias.filter(m =>
                m.tema?.toLowerCase().includes(valor)
            );

            renderizarListaMaterias(filtradas);

        });

    }

}

/* ==========================================
   RENDER LISTA
========================================== */

function renderizarListaMaterias(lista) {

    listaMaterias.innerHTML = "";

    if (!lista.length) {
        listaMaterias.innerHTML = "<p>Nenhuma matéria encontrada.</p>";
        return;
    }

    lista.forEach(materia => {

        const div = document.createElement("div");

        div.className = "item-materia";

        div.innerHTML = `
            <h4>${materia.tema}</h4>
            <span>${materia.disciplina}</span>
        `;

        /* ABRIR PÁGINA DA MATÉRIA */

        div.addEventListener("click", () => {

            window.location.href =
                `materia-detalhe.html?id=${materia.id}`;

        });

        listaMaterias.appendChild(div);

    });

}