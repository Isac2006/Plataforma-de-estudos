let listaDeQuestoesLocal = [];
import { registrarRespostaQuestao } from './estatisticas.js';

/* =========================================================
   🎯 BUSCAR E EXIBIR QUESTÕES
========================================================= */

export async function aparecerquestoes() {
    const disciplinaPedido = document.getElementById("sistema-disciplina")?.value;
    const divQuestao = document.getElementById("resultado-questoes");

    if (!disciplinaPedido) {
        alert("Selecione a disciplina!");
        return;
    }

    try {
        const url = `http://localhost:3000/api/questoes?disciplina=${encodeURIComponent(disciplinaPedido)}`;
        
        const resposta = await fetch(url);

        if (!resposta.ok) throw new Error("Erro ao buscar questões");

        const lista = await resposta.json();

        listaDeQuestoesLocal = lista;

        divQuestao.innerHTML = "";

        if (!lista.length) {
            divQuestao.innerHTML = "<p>Nenhuma questão encontrada.</p>";
            return;
        }

        lista.forEach((q, i) => {
            divQuestao.innerHTML += `
                <div class="card-questao">
                    <h3>Questão ${i + 1}</h3>
                    <p>${q.enunciado}</p>

                    ${q.alternativas.map((alt, indexAlt) => `
                        <label>
                            <input type="radio" name="questao-${i}" value="${indexAlt}">
                            ${alt}
                        </label>
                    `).join("<br>")}

                    <br>
                    <button class="btn-responder" data-index="${i}">Responder</button>
                    <button class="btn-ver" data-index="${i}">Ver Resposta</button>
                    <button class="btn-editar" data-index="${i}">Editar</button>
                    <button class="btn-apagar" data-id="${q.id}">Apagar</button>

                    <div id="res-${i}" style="margin-top:8px;"></div>
                </div>
            `;
        });

        configurarEventosDosBotoes();

    } catch (erro) {
        console.error("Erro:", erro);
        alert("Erro ao conectar com servidor");
    }
}

/* =========================================================
   ✏️ EDIÇÃO
========================================================= */

export function iniciarEdicao(indice) {
    const questao = listaDeQuestoesLocal[indice];
    const divQuestao = document.querySelectorAll(".card-questao")[indice];

    divQuestao.innerHTML = `
        <h3>Editando Questão ${parseInt(indice) + 1}</h3>
        <textarea id="edit-enunciado-${indice}">${questao.enunciado}</textarea>
        ${questao.alternativas.map((alt) => `
            <input type="text" class="edit-alt-${indice}" value="${alt}">
        `).join('')}
        <input type="text" id="edit-correta-${indice}" value="${questao.resposta_correta}">
        <button class="btn-salvar-edit" data-index="${indice}" data-id="${questao.id}">
            Salvar Alterações
        </button>
        <button class="btn-cancelar-edit">Cancelar</button>
    `;

    divQuestao.querySelector('.btn-salvar-edit').onclick = (e) => {
        salvarEdicao(e.target.dataset.index, e.target.dataset.id);
    };

    divQuestao.querySelector('.btn-cancelar-edit').onclick = () => aparecerquestoes();
}

export async function salvarEdicao(indice, id) {
    const enunciado = document.getElementById(`edit-enunciado-${indice}`).value;
    const alternativas = Array.from(document.querySelectorAll(`.edit-alt-${indice}`)).map(i => i.value);
    const resposta_correta = document.getElementById(`edit-correta-${indice}`).value;

    try {
        const response = await fetch(`http://localhost:3000/questoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enunciado, alternativas, resposta_correta })
        });

        if (!response.ok) throw new Error("Erro ao atualizar");

        alert("✅ Questão atualizada com sucesso!");
        aparecerquestoes();

    } catch (erro) {
        console.error("Erro na edição:", erro);
        alert("❌ Erro ao atualizar questão.");
    }
}

/* =========================================================
   🧠 RESPONDER / VER / APAGAR
========================================================= */

export function responder(indice, nomeUsuario) {
    const questao = listaDeQuestoesLocal[indice];
    const feedback = document.getElementById(`res-${indice}`);
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) {
        alert("Selecione uma opção!");
        return;
    }

    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];
    const correto = textoSelecionado.trim() === questao.resposta_correta.trim();

    registrarRespostaQuestao(nomeUsuario, questao.disciplina, correto);

    feedback.innerHTML = correto
        ? "✅ Resposta Correta!"
        : `❌ Errado! Gabarito: ${questao.resposta_correta}`;

    feedback.style.color = correto ? "green" : "red";
}

export function verResposta(indice) {
    const feedback = document.getElementById(`res-${indice}`);
    feedback.innerHTML = `Gabarito: ${listaDeQuestoesLocal[indice].resposta_correta}`;
    feedback.style.color = "blue";
}

export async function apagarQuestao(id) {
    if (!confirm("Tem certeza que deseja excluir esta questão?")) return;

    try {
        const response = await fetch(`http://localhost:3000/questoes/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error("Erro ao apagar");

        alert("Questão apagada!");
        aparecerquestoes();

    } catch (erro) {
        console.error("Erro ao apagar:", erro);
    }
}

/* =========================================================
   🚀 INICIALIZAÇÃO
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
    console.log("📘 questoes.js carregado (modo CRUD)");
});
