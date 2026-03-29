import { obterUsuarioLogado } from '../auth.js';

/* ================= CONFIG ================= */

export const metasAlvo = {
    Matemática: 8, Português: 6, Redação: 4, Física: 4, Química: 4,
    Biologia: 4, História: 3, Geografia: 3, Filosofia: 2, Sociologia: 2, Inglês: 2
};

export const coresMaterias = {
    Matemática: "#e6d816",
    Português: "#0643a5",
    Redação: "#ec4899",
    Física: "#f97316",
    Química: "#8b5cf6",
    Biologia: "#10b981",
    História: "#f59e0b",
    Geografia: "#0a6407",
    Filosofia: "#793e08",
    Sociologia: "#6366f1",
    Inglês: "#14b8a6"
};

const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
let borrachaAtiva = false;

/* ================= INIT ================= */

document.addEventListener("DOMContentLoaded", () => {
    const usuario = obterUsuarioLogado();
    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    const nomeEl = document.getElementById("nomeUsuario");
    if (nomeEl) nomeEl.textContent = `Olá, ${usuario.nome}`;

    // Inicializa cronograma
    inicializarCronograma();
    carregarCronograma();
    configurarBorracha();

    // ✅ Adiciona o evento ao botão de salvar
    const salvarBtn = document.querySelector(".salvar-btn");
    if (salvarBtn) {
        salvarBtn.addEventListener("click", salvarCronograma);
    }
});


/* ================= CRONOGRAMA ================= */

export function inicializarCronograma() {
    const tbody = document.querySelector("#cronograma tbody");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (let h = 7; h <= 23; h++) {
        const hora = String(h).padStart(2, "0") + ":00";
        const tr = document.createElement("tr");

        tr.innerHTML = `
            <td class="hora">${hora}</td>
            ${dias.map(dia => `
                <td class="celula-horario"
                    data-dia="${dia}"
                    data-hora="${hora}">
                </td>
            `).join("")}
        `;

        tbody.appendChild(tr);
    }

    configurarInteracoes();
    atualizarEstatisticas();
}

/* ================= INTERAÇÕES ================= */

function configurarInteracoes() {

    document.querySelectorAll(".materia-btn").forEach(btn => {
        btn.draggable = true;

        btn.addEventListener("dragstart", e => {
            e.dataTransfer.setData("text/plain", btn.dataset.materia);
        });
    });

    document.querySelectorAll(".celula-horario").forEach(td => {

        td.addEventListener("dragover", e => e.preventDefault());

        td.addEventListener("dragenter", () => {
            td.classList.add("drag-hover");
        });

        td.addEventListener("dragleave", () => {
            td.classList.remove("drag-hover");
        });

        td.addEventListener("drop", e => {
            e.preventDefault();
            td.classList.remove("drag-hover");

            if (td.dataset.materia) {
                alert("⚠️ Horário já ocupado");
                return;
            }

            const materia = e.dataTransfer.getData("text/plain");
            if (materia) adicionarMateria(td, materia);
        });
    });

    document.addEventListener("dragend", () => {
        document.querySelectorAll(".drag-hover")
            .forEach(el => el.classList.remove("drag-hover"));
    });
}

/* ================= MANIPULAÇÃO ================= */

export function adicionarMateria(td, materia, status = "pendente") {
    td.dataset.materia = materia;
    td.dataset.status = status;

    const classeMateria = "materia-" + materia.replace(/\s+/g, "");

    td.innerHTML = `
        <div class="bloco ${status} ${classeMateria}"
             style="background:${coresMaterias[materia] || "#64748b"}">
            ${materia}
        </div>
    `;

    atualizarEstatisticas();
}

export function removerMateria(td) {
    const bloco = td.querySelector(".bloco");
    if (!bloco) return;

    bloco.classList.add("apagando");

    setTimeout(() => {
        td.innerHTML = "";
        td.removeAttribute("data-materia");
        td.removeAttribute("data-status");
        atualizarEstatisticas();
    }, 350);
}

/* ================= BORRACHA ================= */

function configurarBorracha() {
    const borrachaBtn = document.getElementById("borrachaBtn");
    if (!borrachaBtn) return;

    function alternarBorracha() {
        borrachaAtiva = !borrachaAtiva;
        borrachaBtn.classList.toggle("active", borrachaAtiva);
        document.body.classList.toggle("borracha-ativa", borrachaAtiva);
    }

    borrachaBtn.addEventListener("click", alternarBorracha);

    document.addEventListener("keydown", e => {
        if (e.key.toLowerCase() === "e" && !e.repeat) {
            alternarBorracha();
        }
    });

    document.addEventListener("click", e => {
        if (!borrachaAtiva) return;
        const bloco = e.target.closest(".bloco");
        if (bloco) removerMateria(bloco.parentElement);
    });
}

/* ================= CONCLUIR BLOCO ================= */

document.addEventListener("dblclick", e => {
    const bloco = e.target.closest(".bloco");
    if (!bloco) return;

    const td = bloco.parentElement;

    bloco.classList.toggle("concluido");
    td.dataset.status = bloco.classList.contains("concluido")
        ? "concluido"
        : "pendente";
});

/* ================= ESTATÍSTICAS ================= */

function atualizarEstatisticas() {
    const total = {};
    let soma = 0;

    document.querySelectorAll("td[data-materia]").forEach(td => {
        const materia = td.dataset.materia;
        total[materia] = (total[materia] || 0) + 1;
        soma++;
    });

    const totalHoras = document.getElementById("totalHoras");
    if (totalHoras) totalHoras.textContent = soma + "h";

    const ul = document.getElementById("horasPorMateria");
    if (!ul) return;

    ul.innerHTML = "";
    Object.entries(total).forEach(([materia, horas]) => {
        const li = document.createElement("li");
        li.innerHTML = `
            <span style="color:${coresMaterias[materia]}">${materia}</span>
            <b>${horas}h</b>
        `;
        ul.appendChild(li);
    });
}

export async function salvarCronograma() {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    const cronogramaData = [];

    // Pega todas as células com matérias
    document.querySelectorAll("#cronograma td[data-materia]").forEach(td => {
        cronogramaData.push({
            dia: td.dataset.dia,
            hora: td.dataset.hora,
            materia: td.dataset.materia,
            status: td.dataset.status || "pendente"
        });
    });

    const totalHoras = cronogramaData.length;

    try {
        const res = await fetch("/salvar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuario: usuario.email || usuario.nome, // bate com o backend
                totalHoras,
                cronograma: cronogramaData
            })
        });

        if (!res.ok) throw new Error("Erro ao salvar no servidor");

        alert("💾 Cronograma salvo no servidor com sucesso!");
    } catch (e) {
        console.error("❌ Erro ao salvar cronograma:", e);
        alert("❌ Falha ao salvar no servidor");
    }
}

async function carregarCronograma() {
    const usuario = obterUsuarioLogado();
    if (!usuario) return;

    try {
        const res = await fetch(
            `/usuario/dados?nome=${encodeURIComponent(usuario.nome)}`
        );

        if (!res.ok) throw new Error("Erro ao buscar dados do usuário");

        const dados = await res.json();
        const cronogramaData = dados.cronograma || [];

        cronogramaData.forEach(item => {
            const td = document.querySelector(
                `td[data-dia="${item.dia}"][data-hora="${item.hora}"]`
            );
            if (td) adicionarMateria(td, item.materia, item.status);
        });

    } catch (e) {
        console.error("❌ Erro ao carregar cronograma:", e);
    }
}

