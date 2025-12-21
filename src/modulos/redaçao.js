// moduloRedacao.js

let comentarios = [];
let idRedacaoAtual = null;

/* 1. LÓGICA DE DESTACAR (TEXTO) */
export function destacar() {
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

/* 2. ATUALIZAR LISTA LATERAL (Privada do módulo) */
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
export async function enviarRedacao() {
    const nomeAluno = prompt("Digite seu nome completo para identificação:");
    const tituloRedacao = prompt("Título da redação:");

    if (!nomeAluno || !tituloRedacao) {
        alert("O nome e o título são obrigatórios para identificar seu envio!");
        return;
    }

    const dados = {
        usuario: nomeAluno,
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
}

/* 4. CONSULTAR REDAÇÃO */
export async function consultarMinhaRedacao() {
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

        resultadoDiv.innerHTML = "<h4>Suas redações:</h4>";
        redacoes.forEach(r => {
            const btn = document.createElement("button");
            btn.textContent = `${r.titulo} - Status: ${r.status}`;
            btn.className = "btn-consulta"; // Use CSS em vez de style inline se possível
            
            btn.onclick = () => {
                document.getElementById("editor").innerHTML = r.conteudo_html;
                comentarios = r.comentarios || [];
                atualizarVisualComentarios();
                document.getElementById("info-redacao").innerText = `📄 Vendo: ${r.titulo} (${r.status})`;
            };
            
            resultadoDiv.appendChild(btn);
        });

    } catch (erro) {
        alert("Erro ao buscar redações.");
    }
}

/* 5. PROFESSOR: BUSCAR MAIS ANTIGA (GET) */
export async function buscarProximaFila() {
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

/* 6. PROFESSOR: SALVAR CORREÇÃO (PUT) */
export async function salvarCorrecaoProfessor() {
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