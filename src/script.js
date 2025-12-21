// 1. Importação de funções externas
import { aparecerquestoes } from './modulos/questoes.js';
import { cadastrarMateria } from './modulos/cadastrarmateria.js';

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





// redação nao mexer por equanto 



let comentarios = [];
    let idRedacaoAtual = null;

    /* 1. LÓGICA DE DESTACAR (TEXTO) */
    function destacar() {
        const selecao = window.getSelection();
        if (!selecao.rangeCount || selecao.isCollapsed) {
            alert("Selecione um trecho do texto para comentar.");
            return;
        }

        const textoComentario = prompt("Digite a observação pedagógica:");
        if (!textoComentario) return;

        const cor = document.getElementById("cor").value;
        const range = selecao.getRangeAt(0);
        const trecho = range.toString();

        const span = document.createElement("span");
        span.style.backgroundColor = cor;
        span.style.padding = "2px 2px";
        span.style.borderRadius = "3px";
        span.textContent = trecho;

        range.deleteContents();
        range.insertNode(span);
        selecao.removeAllRanges();

        comentarios.push({ trecho, comentario: textoComentario, cor });
        atualizarVisualComentarios();
    }

    /* 2. ATUALIZAR LISTA LATERAL */
    function atualizarVisualComentarios() {
        const lista = document.getElementById("listaComentarios");
        if (comentarios.length === 0) {
            lista.innerHTML = '<p style="color: #999; font-style: italic;">Nenhum comentário.</p>';
            return;
        }

        lista.innerHTML = "";
        comentarios.forEach(c => {
            const div = document.createElement("div");
            div.className = "comment";
            div.style.borderColor = c.cor;
            div.innerHTML = `<span>No trecho: "${c.trecho}"</span><p>${c.comentario}</p>`;
            lista.appendChild(div);
        });
    }

    /* 3. ALUNO: ENVIAR PARA O BANCO (POST) */
   async function enviarRedacao() {
    const nomeAluno = prompt("Digite seu nome completo para identificação:");
    const tituloRedacao = prompt("Título da redação:");

    if (!nomeAluno || !tituloRedacao) {
        alert("O nome e o título são obrigatórios para identificar seu envio!");
        return;
    }

    const dados = {
        usuario: nomeAluno, // Enviando o nome capturado no prompt
        titulo: tituloRedacao,
        conteudo_html: document.getElementById("editor").innerHTML
    };

    try {
        const res = await fetch('http://localhost:3000/redacoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            alert(`Sucesso, ${nomeAluno}! Sua redação foi enviada.`);
            location.reload();
        }
    } catch (e) { 
        alert("Erro ao conectar ao servidor."); 
    }
}async function consultarMinhaRedacao() {
    const nome = document.getElementById("consulta-nome").value.trim();
    const resultadoDiv = document.getElementById("resultado-consulta");

    if (!nome) return alert("Digite seu nome!");

    try {
        const response = await fetch(`http://localhost:3000/redacoes/aluno?nome=${nome}`);
        const redacoes = await response.json();

        if (redacoes.length === 0) {
            resultadoDiv.innerHTML = "<p>Nenhuma redação encontrada para este nome.</p>";
            return;
        }

        // Criamos uma lista de botões para cada redação encontrada
        resultadoDiv.innerHTML = "<h4>Suas redações:</h4>";
        redacoes.forEach(r => {
            const btn = document.createElement("button");
            btn.textContent = `${r.titulo} - Status: ${r.status}`;
            btn.style = "display: block; width: 100%; margin-bottom: 5px; padding: 10px; text-align: left; cursor: pointer;";
            
            btn.onclick = () => {
                // Ao clicar, o texto e os comentários carregam no editor principal
                document.getElementById("editor").innerHTML = r.conteudo_html;
                comentarios = r.comentarios || [];
                atualizarVisualComentarios(); // Aquela função que já criamos
                document.getElementById("info-redacao").innerText = `📄 Vendo: ${r.titulo} (${r.status})`;
            };
            
            resultadoDiv.appendChild(btn);
        });

    } catch (erro) {
        alert("Erro ao buscar redações.");
    }
}

// Não esqueça de exportar para o HTML
window.consultarMinhaRedacao = consultarMinhaRedacao;

    /* 4. PROFESSOR: BUSCAR MAIS ANTIGA (GET) */
    async function buscarProximaFila() {
        try {
            const res = await fetch('http://localhost:3000/redacoes/proxima');
            if (res.status === 404) return alert("Fila vazia! Todas as redações foram corrigidas.");

            const redacao = await res.json();
            idRedacaoAtual = redacao.id;
            
            document.getElementById("editor").innerHTML = redacao.conteudo_html;
            document.getElementById("info-redacao").innerText = `🧐 Corrigindo: ${redacao.titulo} (${redacao.usuario})`;
            comentarios = redacao.comentarios || [];
            atualizarVisualComentarios();
        } catch (e) { alert("Erro ao carregar redação."); }
    }

    /* 5. PROFESSOR: SALVAR CORREÇÃO (PUT) */
    async function salvarCorrecaoProfessor() {
        if (!idRedacaoAtual) return alert("Selecione uma redação na fila primeiro!");

        const dados = {
            conteudo_html: document.getElementById("editor").innerHTML,
            comentarios: comentarios
        };

        try {
            const res = await fetch(`http://localhost:3000/redacoes/corrigir/${idRedacaoAtual}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dados)
            });
            if (res.ok) {
                alert("✅ Correção finalizada! O aluno já pode visualizar.");
                location.reload();
            }
        } catch (e) { alert("Erro ao salvar correção."); }
    }
    // Torna as funções de redação acessíveis para os botões do HTML
window.destacar = destacar;
window.enviarRedacao = enviarRedacao;
window.buscarProximaFila = buscarProximaFila;
window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;