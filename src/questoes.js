import { cadastrarQuestao } from "./modulos/questoesCadastro.js";
import { gerarQuestoes } from "./modulos/questoesSistema.js";

document.addEventListener("DOMContentLoaded", () => {

    // 🔹 BOTÃO: CADASTRAR QUESTÃO
    const btnCadastrar = document.getElementById("btn-cadastrar-questao");
    if (btnCadastrar) {
        btnCadastrar.addEventListener("click", () => {
            cadastrarQuestao();
        });
    } else {
        console.warn("⚠️ Botão btn-cadastrar-questao não encontrado");
    }

    // 🔹 BOTÃO: GERAR QUESTÕES
    const btnGerar = document.getElementById("btn-gerar-questoes");
    if (btnGerar) {
        btnGerar.addEventListener("click", () => {
            gerarQuestoes();
        });
    } else {
        console.warn("⚠️ Botão btn-gerar-questoes não encontrado");
    }

});
// ✏️ EDITAR QUESTÃO
export async function editarQuestao(id) {
    const enunciado = prompt("Novo enunciado:");
    const alt1 = prompt("Alternativa A:");
    const alt2 = prompt("Alternativa B:");
    const alt3 = prompt("Alternativa C:");
    const alt4 = prompt("Alternativa D:");
    const resposta = prompt("Resposta correta (A, B, C ou D):");

    if (!enunciado || !alt1 || !alt2 || !alt3 || !alt4 || !resposta) {
        alert("Preencha todos os campos!");
        return;
    }

    try {
        const res = await fetch(`/questoes/${id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                enunciado,
                alternativas: [alt1, alt2, alt3, alt4],
                resposta_correta: resposta
            })
        });

        const data = await res.json();
        alert(data.mensagem);

        location.reload(); // simples por enquanto

    } catch (erro) {
        console.error("Erro ao editar:", erro);
    }
}

// 🗑️ EXCLUIR QUESTÃO
export async function excluirQuestao(id) {
    const confirmar = confirm("Tem certeza que deseja apagar?");

    if (!confirmar) return;

    try {
        const res = await fetch(`/questoes/${id}`, {
            method: "DELETE"
        });

        const data = await res.json();
        alert(data.mensagem);

        location.reload();

    } catch (erro) {
        console.error("Erro ao excluir:", erro);
    }
}