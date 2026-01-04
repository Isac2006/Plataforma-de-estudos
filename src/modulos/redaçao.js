import { registrarProgresso } from './estatisticas.js';

// Variáveis de controle interno
let comentarios = [];
let idRedacaoAtual = null;

/* 1. LÓGICA DE DESTACAR (TEXTO) - (Mantida igual) */
export function destacar() {
    const selecao = window.getSelection();
    if (!selecao.rangeCount || selecao.isCollapsed) {
        alert("Selecione um trecho do texto para comentar.");
        return;
    }

    const textoComentario = prompt("Digite a observação pedagógica:");
    if (!textoComentario) return;

    const cor = document.getElementById("cor") ? document.getElementById("cor").value : "#ffeb3b";
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
    if (!lista) return;

    if (comentarios.length === 0) {
        lista.innerHTML = '<p style="color: #999; font-style: italic;">Nenhum comentário.</p>';
        return;
    }

    lista.innerHTML = "";
    comentarios.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.style.borderColor = c.cor || "#ccc";
        div.innerHTML = `<span>No trecho: "${c.trecho}"</span><p>${c.comentario}</p>`;
        lista.appendChild(div);
    });
}

/* 3. ALUNO: ENVIAR PARA O BANCO (AGORA COM ID) */
export async function enviarRedacao() {
    // Recupera dados do localStorage (salvos no login)
    const idUsuario = localStorage.getItem("usuarioId");
    const nomeUsuario = localStorage.getItem("nomeUsuario");
    const tituloRedacao = prompt("Título da redação:");

    if (!idUsuario) {
        alert("Erro: Você precisa estar logado para enviar uma redação.");
        return;
    }

    if (!tituloRedacao) {
        alert("O título é obrigatório!");
        return;
    }

    const dados = {
        idUsuario: idUsuario, // MUDANÇA: Envia o ID para vincular corretamente
        usuario: nomeUsuario, // Envia o nome apenas para exibição visual
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
            // --- LÓGICA DE ESTATÍSTICA COM ID ---
            // Agora registramos o progresso usando o ID único
            await registrarProgresso(idUsuario, "redacoesFeitas");
            
            alert(`Sucesso! Sua redação foi enviada.`);
            location.reload();
        } else {
            alert("Erro ao salvar redação no servidor.");
        }
    } catch (e) { 
        console.error(e);
        alert("Erro ao conectar ao servidor."); 
    }
}

/* 4. CONSULTAR REDAÇÃO (AGORA POR ID) */
export async function consultarMinhaRedacao() {
    const resultadoDiv = document.getElementById("resultado-consulta");
    
    // MUDANÇA: Pega o ID automático, não pede para digitar nome
    const idUsuario = localStorage.getItem("usuarioId");

    if (!idUsuario) {
        if(resultadoDiv) resultadoDiv.innerHTML = "<p>Faça login para ver suas redações.</p>";
        return;
    }

    try {
        // MUDANÇA: A URL agora busca por ?idUsuario=...
        const response = await fetch(`http://localhost:3000/redacoes/aluno?idUsuario=${idUsuario}`);
        const redacoes = await response.json();

        if (resultadoDiv) {
            if (redacoes.length === 0) {
                resultadoDiv.innerHTML = "<p>Nenhuma redação encontrada para você.</p>";
                return;
            }

            resultadoDiv.innerHTML = "<h4>Suas redações:</h4>";
            redacoes.forEach(r => {
                const btn = document.createElement("button");
                // Mostra o Título e o Status (Corrigida/Pendente)
                btn.textContent = `${r.titulo} - ${r.status || 'Pendente'}`;
                btn.className = "btn-consulta"; 
                btn.style.display = "block";
                btn.style.margin = "5px 0";
                
                btn.onclick = () => {
                    document.getElementById("editor").innerHTML = r.conteudo_html;
                    comentarios = r.comentarios || [];
                    atualizarVisualComentarios();
                    const info = document.getElementById("info-redacao");
                    if(info) info.innerText = `📄 Vendo: ${r.titulo} (${r.status || 'Pendente'})`;
                };
                
                resultadoDiv.appendChild(btn);
            });
        }

    } catch (erro) {
        console.error(erro);
        alert("Erro ao buscar redações.");
    }
}

/* 5. PROFESSOR: BUSCAR MAIS ANTIGA (GET) */
export async function buscarProximaFila() {
    try {
        const res = await fetch('http://localhost:3000/redacoes/proxima');
        if (res.status === 404) return alert("Fila vazia! Todas as redações foram corrigidas.");

        const redacao = await res.json();
        idRedacaoAtual = redacao.id; // Isso já vem do banco (ID da redação, não do aluno)
        
        document.getElementById("editor").innerHTML = redacao.conteudo_html;
        const info = document.getElementById("info-redacao");
        if(info) info.innerText = `🧐 Corrigindo: ${redacao.titulo} (Aluno: ${redacao.usuario})`;
        
        comentarios = redacao.comentarios || [];
        atualizarVisualComentarios();
    } catch (e) { 
        console.error(e);
        alert("Erro ao carregar redação."); 
    }
}

/* 6. PROFESSOR: SALVAR CORREÇÃO (PUT) */
export async function salvarCorrecaoProfessor() {
    if (!idRedacaoAtual) return alert("Selecione uma redação na fila primeiro!");

    const dados = {
        conteudo_html: document.getElementById("editor").innerHTML,
        comentarios: comentarios
        // O status "Corrigida" geralmente é setado no servidor ao receber essa requisição
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