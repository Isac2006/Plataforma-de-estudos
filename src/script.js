// 1. Importação de funções externas
import { aparecerquestoes } from './modulos/questoes.js';
import { cadastrarMateria } from './modulos/cadastrarmateria.js';
import { destacar, enviarRedacao, consultarMinhaRedacao, buscarProximaFila, salvarCorrecaoProfessor } from './modulos/redaçao.js';
import { cadastrarAula, carregarAula } from './modulos/aula.js';
import { buscarDadosParaModulo, finalizarModulo, carregarModuloCompleto } from './modulos/construtor.js';
import { inicializarCronograma, salvarCronograma, registrarEstudoAutomatico } from './modulos/cronograma.js';

// para login trabalhar depois(provisorio)


const usuarioLogado = "Joao"

inicializarCronograma();






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
    btnBuscarAula.addEventListener("click", async (e) => {
        e.preventDefault();
        
        // 1. Carrega o vídeo na tela
        await carregarAula();
        
        // 2. Pega a matéria selecionada e registra o estudo
        const disciplina = document.getElementById("select-disciplina").value;
        if (disciplina) {
            registrarEstudoAutomatico(usuarioLogado, disciplina);
            console.log(`Estudo registrado para ${usuarioLogado} na matéria ${disciplina}`);
        }
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




// contruto de modulo 


console.log("✅ Script carregado com sucesso!");

// 2. Configuração Global (Para o onclick do HTML)
window.destacar = destacar;
window.enviarRedacao = enviarRedacao;
window.consultarMinhaRedacao = consultarMinhaRedacao;
window.buscarProximaFila = buscarProximaFila;
window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;

// 3. Função de Cadastro de Questão (Única)
async function cadastrarQuestao() {
    const disciplinaEl = document.getElementById("ins-disciplina");
    const temaEl = document.getElementById("ins-tema");
    const enunciadoEl = document.getElementById("ins-enunciado");
    const respostaCorretaEl = document.getElementById("ins-correta");
    const inputsAlt = document.querySelectorAll(".alt-input");

    if (!disciplinaEl || !temaEl || !enunciadoEl || !respostaCorretaEl) return;

    const alternativas = Array.from(inputsAlt).map(input => input.value.trim());

    if (!disciplinaEl.value || !temaEl.value || !enunciadoEl.value || alternativas.includes("")) {
        alert("⚠️ Por favor, preencha todos os campos!");
        return;
    }

    const dados = {
        disciplina: disciplinaEl.value.toLowerCase().trim(),
        tema: temaEl.value.toLowerCase().trim(),
        enunciado: enunciadoEl.value.trim(),
        alternativas: alternativas,
        resposta_correta: respostaCorretaEl.value.trim()
    };

    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("✅ Questão cadastrada com sucesso!");
            [disciplinaEl, temaEl, enunciadoEl, respostaCorretaEl].forEach(el => el.value = "");
            inputsAlt.forEach(el => el.value = "");
        }
    } catch (erro) {
        console.error("❌ Erro na conexão:", erro);
    }
}

// 4. Ouvintes de Eventos (Configurados uma única vez)
document.getElementById("gerar-questao")?.addEventListener("click", aparecerquestoes);
document.getElementById("btn-salvar-questao")?.addEventListener("click", cadastrarQuestao);
document.getElementById("btn-cadastrar-materia")?.addEventListener("click", cadastrarMateria);
document.getElementById('btnDestacar')?.addEventListener('click', destacar);

document.getElementById("btn-salvar-aula")?.addEventListener("click", (e) => {
    e.preventDefault();
    cadastrarAula();
});

document.getElementById("btn-buscar-aula")?.addEventListener("click", (e) => {
    e.preventDefault();
    carregarAula();
});

document.getElementById("construtor-tema")?.addEventListener("change", buscarDadosParaModulo);
document.getElementById("btn-salvar-modulo-completo")?.addEventListener("click", (e) => {
    e.preventDefault();
    finalizarModulo();
});

document.getElementById("btn-carregar-tudo")?.addEventListener("click", (e) => {
    e.preventDefault();
    carregarModuloCompleto();
});

// 5. Lógica de Selects Dinâmicos (Genérica)
async function atualizarTemas(idDisciplina, idTema, isAula = false) {
    const discEl = document.getElementById(idDisciplina);
    const temaEl = document.getElementById(idTema);
    if (!discEl || !temaEl) return;

    discEl.addEventListener("change", async () => {
        const disciplina = discEl.value;
        if (!disciplina) return;
        
        try {
            const rota = isAula ? 'aulas/temas' : 'temas';
            const res = await fetch(`http://localhost:3000/${rota}?disciplina=${disciplina}`);
            const temas = await res.json();
            
            temaEl.innerHTML = `<option value="">Selecione o tema${isAula ? ' da aula' : ''}</option>`;
            temaEl.disabled = false;

            temas.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = isAula ? t.charAt(0).toUpperCase() + t.slice(1) : t;
                temaEl.appendChild(opt);
            });
        } catch (e) { console.error("Erro no select dinâmico:", e); }
    });
}

// Ativando os campos de tema
atualizarTemas("diciplinapedido", "temapedido");
atualizarTemas("construtor-disciplina", "construtor-tema");
atualizarTemas("view-disciplina", "view-tema");
atualizarTemas("select-disciplina", "select-tema-aula", true);






// cronograma 
// 3. Configure o botão de salvar:
const btnSalvarCronograma = document.querySelector(".btn-salvar");
if (btnSalvarCronograma) {
    btnSalvarCronograma.addEventListener("click", (e) => {
        e.preventDefault();
        salvarCronograma();
    });
}












