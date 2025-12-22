// 1. Importação de funções externas
import { aparecerquestoes } from './modulos/questoes.js';
import { cadastrarMateria } from './modulos/cadastrarmateria.js';
import { destacar, enviarRedacao, consultarMinhaRedacao, buscarProximaFila, salvarCorrecaoProfessor } from './modulos/redaçao.js';;
import { cadastrarAula, carregarAula } from './modulos/aula.js';


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

// Botão para cadastrar matéria
const btnCadastrarMateria = document.getElementById("btn-cadastrar-materia");
if (btnCadastrarMateria) {
    btnCadastrarMateria.addEventListener("click", cadastrarMateria);
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





// redação 



document.getElementById('btnDestacar').addEventListener('click', destacar);
// Registra globalmente para que o 'onclick' do HTML encontre as funções
    window.destacar = destacar;
    window.enviarRedacao = enviarRedacao;
    window.consultarMinhaRedacao = consultarMinhaRedacao;
    window.buscarProximaFila = buscarProximaFila;
    window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;



// aula nao mexer por enquanto
// --- CONFIGURAÇÃO AULAS/VÍDEOS ---

// --- LÓGICA DE TEMAS DINÂMICOS PARA AULAS (ALUNO) ---

// Botão de Salvar (Professor)
const btnSalvarAula = document.getElementById("btn-salvar-aula");
if (btnSalvarAula) {
    // Removemos qualquer onclick antigo e adicionamos o evento via JS
    btnSalvarAula.onclick = null; 
    btnSalvarAula.addEventListener("click", (e) => {
        e.preventDefault();
        cadastrarAula();
    });
}

// Botão de Buscar (Aluno)
const btnBuscarAula = document.getElementById("btn-buscar-aula");
if (btnBuscarAula) {
    btnBuscarAula.onclick = null;
    btnBuscarAula.addEventListener("click", (e) => {
        e.preventDefault();
        carregarAula();
    });
}

// --- LÓGICA DO SELECT DINÂMICO (O código que você enviou) ---
const selectDisciplinaAula = document.getElementById("select-disciplina");
const selectTemaAula = document.getElementById("select-tema-aula");

if (selectDisciplinaAula && selectTemaAula) {
    selectDisciplinaAula.addEventListener("change", async () => {
        const disciplina = selectDisciplinaAula.value;

        if (!disciplina) {
            selectTemaAula.innerHTML = '<option value="">Selecione a matéria primeiro</option>';
            selectTemaAula.disabled = true;
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/aulas/temas?disciplina=${disciplina}`);
            const temas = await resposta.json();

            selectTemaAula.innerHTML = '<option value="">Selecione o tema da aula</option>';
            selectTemaAula.disabled = false;

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema; 
                option.textContent = tema.charAt(0).toUpperCase() + tema.slice(1);
                selectTemaAula.appendChild(option);
            });

            if (temas.length === 0) {
                selectTemaAula.innerHTML = '<option value="">Nenhuma aula encontrada</option>';
                selectTemaAula.disabled = true;
            }
        } catch (erro) {
            console.error("❌ Erro ao carregar temas de aula:", erro);
        }
    });
}