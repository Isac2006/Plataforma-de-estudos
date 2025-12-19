// 1. Importação de funções externas
import { aparecerquestoes } from './modulos/questoes.js';

console.log("✅ Script carregado com sucesso!");

// --- LÓGICA DE TEMAS DINÂMICOS ---
const selectDiciplina = document.getElementById("diciplinapedido");
const selectTema = document.getElementById("temapedido");

if (selectDiciplina && selectTema) {
    selectDiciplina.addEventListener("change", async () => {
        const disciplina = selectDiciplina.value;

        if (!disciplina) {
            selectTema.innerHTML = '<option value="">Selecione uma matéria primeiro</option>';
            selectTema.disabled = true;
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/temas?disciplina=${disciplina}`);
            const temas = await resposta.json();

            selectTema.innerHTML = '<option value="">Selecione o tema</option>';
            selectTema.disabled = false;

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema.toLowerCase();
                option.textContent = tema;
                selectTema.appendChild(option);
            });

        } catch (erro) {
            console.error("❌ Erro ao carregar temas:", erro);
            selectTema.innerHTML = '<option value="">Erro ao carregar temas</option>';
        }
    });
}

// --- CONFIGURAÇÃO DOS OUVINTES DE CLIQUE (EVENT LISTENERS) ---

// Botão para buscar questões
const btnGerar = document.getElementById("gerar-questao");
if (btnGerar) {
    btnGerar.addEventListener("click", aparecerquestoes);
}

// Botão para cadastrar questão (Ajustado para evitar ReferenceError)
const btnSalvar = document.getElementById("btn-salvar-questao");
if (btnSalvar) {
    btnSalvar.addEventListener("click", cadastrarQuestao);
}

// --- FUNÇÃO DE CADASTRO ---
async function cadastrarQuestao() {
    // Captura os elementos
    const disciplinaEl = document.getElementById("ins-disciplina");
    const temaEl = document.getElementById("ins-tema");
    const enunciadoEl = document.getElementById("ins-enunciado");
    const respostaCorretaEl = document.getElementById("ins-correta");

    if (!disciplinaEl || !temaEl || !enunciadoEl || !respostaCorretaEl) {
        console.error("Campos do formulário não encontrados!");
        return;
    }

    const disciplina = disciplinaEl.value;
    const tema = temaEl.value;
    const enunciado = enunciadoEl.value;
    const resposta_correta = respostaCorretaEl.value;

    const inputsAlt = document.querySelectorAll(".alt-input");
    const alternativas = Array.from(inputsAlt).map(input => input.value);

    // Validação básica
    if (!disciplina || !tema || !enunciado || alternativas.includes("")) {
        alert("Por favor, preencha todos os campos e todas as alternativas!");
        return;
    }

    const dados = {
        disciplina: disciplina.toLowerCase().trim(),
        tema: tema.toLowerCase().trim(),
        enunciado: enunciado,
        alternativas: alternativas,
        resposta_correta: resposta_correta
    };

    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("✅ Sucesso: " + result.mensagem);
            // Limpa os campos após o sucesso
            [disciplinaEl, temaEl, enunciadoEl, respostaCorretaEl].forEach(el => el.value = "");
            inputsAlt.forEach(el => el.value = "");
        } else {
            alert("❌ Erro: " + result.mensagem);
        }
    } catch (erro) {
        console.error("Erro na conexão:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}