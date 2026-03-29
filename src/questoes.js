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
