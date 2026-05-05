import { obterUsuarioLogado } from '../auth.js';
import { buscarDadosParaModulo, finalizarModulo } from './construtor.js';
import { somenteProfessor } from "./controleAcesso.js";

document.addEventListener("DOMContentLoaded", () => {
    somenteProfessor(".professores", "ocultar");
});

const usuario = obterUsuarioLogado();
console.log("Usuário logado:", usuario);

if (!usuario) {
    window.location.replace('login.html');
    throw new Error('Usuário não autenticado');
}

// ================= MENSAGEM =================
function exibirMensagemSistema(texto, tipo = "erro") {
    const msg = document.getElementById("mensagem-sistema-questoes");
    if (!msg) return;

    msg.textContent = texto;
    msg.style.display = "block";

    if (tipo === "sucesso") {
        msg.style.background = "#e5ffe5";
        msg.style.color = "#006400";
        msg.style.border = "1px solid #9be59b";
    } else {
        msg.style.background = "#ffe5e5";
        msg.style.color = "#a10000";
        msg.style.border = "1px solid #ffb3b3";
    }

    setTimeout(() => { msg.style.display = "none"; }, 4000);
}

// ================= CARREGAR TEMAS =================
async function carregarTemasPorDisciplina() {
    const disciplina = document.getElementById("sistema-disciplina")?.value;
    const selectTema = document.getElementById("sistema-tema");

    if (!disciplina || !selectTema) return;

    try {
        const resposta = await fetch(
            `http://localhost:3000/temas?disciplina=${encodeURIComponent(disciplina)}`
        );

        if (!resposta.ok) throw new Error("Erro ao buscar temas");

        const temas = await resposta.json();

        selectTema.innerHTML = `<option value="">Selecione o Tema (opcional)</option>`;

        temas.forEach(tema => {
            const option = document.createElement("option");
            option.value = tema;
            option.textContent = tema;
            selectTema.appendChild(option);
        });

    } catch (erro) {
        console.error("Erro ao carregar temas:", erro);
    }
}

// ================= GERAR QUESTÕES =================
export async function gerarQuestoes() {
    const disciplina = document.getElementById("sistema-disciplina")?.value;
    const tema       = document.getElementById("sistema-tema")?.value;
    const quantidade = document.getElementById("sistema-quantidade")?.value;

    if (!disciplina || !quantidade) {
        exibirMensagemSistema("⚠️ Selecione a disciplina e informe a quantidade de questões.", "erro");
        return;
    }

    exibirMensagemSistema("⏳ Buscando questões...", "sucesso");

    try {
        const resposta = await fetch(
            `http://localhost:3000/api/questoes?disciplina=${encodeURIComponent(disciplina)}&tema=${encodeURIComponent(tema || "")}`
        );

        if (!resposta.ok) throw new Error("Falha ao buscar questões");

        const questoes = await resposta.json();

        if (!questoes.length) {
            exibirMensagemSistema("⚠️ Nenhuma questão encontrada para esse tema.", "erro");
            return;
        }

        renderizarQuestoes(questoes.slice(0, quantidade));

    } catch (erro) {
        console.error("Erro real:", erro);
        exibirMensagemSistema("❌ Erro ao carregar o banco de questões.", "erro");
    }
}

// ================= RENDERIZAR QUESTÕES =================
function renderizarQuestoes(lista) {
    const container = document.getElementById("resultado-questoes");
    if (!container) return;

    container.innerHTML = "";

    lista.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "questao-card";

        const letras = ["A", "B", "C", "D"];

        div.innerHTML = `
            <h3>Questão ${index + 1}</h3>
            <p><strong>${q.enunciado}</strong></p>

            <ul class="lista-alternativas">
                ${letras.map((letra, i) => `
                    <li class="alternativa" data-letra="${letra}">
                        <strong>${letra})</strong> ${q.alternativas[i]}
                    </li>
                `).join("")}
            </ul>

            <div class="explicacao">
                <strong>📘 Explicação:</strong>
                <p>${q.explicacao || "Sem explicação cadastrada."}</p>
            </div>
        `;

        const alternativasEls = div.querySelectorAll(".alternativa");
        const explicacaoEl    = div.querySelector(".explicacao");

        alternativasEls.forEach(alt => {
            alt.addEventListener("click", async () => {
                if (div.classList.contains("respondida")) return;
                div.classList.add("respondida");

                const letraEscolhida = alt.dataset.letra;
                const correta = q.resposta_correta;
                const acertou = letraEscolhida === correta;

                alternativasEls.forEach(a => {
                    if (a.dataset.letra === correta) a.classList.add("correta");
                    if (a.dataset.letra === letraEscolhida && a.dataset.letra !== correta) a.classList.add("errada");
                });

                explicacaoEl.classList.add("mostrar");

                // 🔥 REGISTRA NO BACKEND
                try {
                    const usuarioAtual = obterUsuarioLogado(); // ✅ padrão do projeto

                    if (!usuarioAtual?.nome) return;

                    await fetch("http://localhost:3000/usuario/registrar-resposta", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            usuario:    usuarioAtual.nome,
                            disciplina: q.disciplina,
                            acertou,
                            questao_id: q.id || null
                        })
                    });

                    console.log("📊 Questão registrada para o usuário");

                } catch (e) {
                    console.error("Erro ao registrar estatística:", e);
                }
            });
        });

        container.appendChild(div);
    });
}

// ================= INICIALIZAÇÃO =================
document.addEventListener("DOMContentLoaded", () => {
    const selectDisciplina = document.getElementById("sistema-disciplina");
    if (selectDisciplina) {
        selectDisciplina.addEventListener("change", carregarTemasPorDisciplina);
    }
});