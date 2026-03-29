// src/modulos/moduloRedacao.js

import { registrarProgresso } from './estatisticas.js';
import { obterUsuarioLogado } from '../auth.js';
import { somenteProfessor } from "./controleAcesso.js";

document.addEventListener("DOMContentLoaded", () => {

    // 🔒 Oculta área inteira
    somenteProfessor(".professores", "ocultar");

});

let comentarios = [];
let idRedacaoAtual = null;

// Preencher o campo "Seu nome" automaticamente
document.addEventListener("DOMContentLoaded", () => {
    const usuario = obterUsuarioLogado();
    const nomeDisplay = document.getElementById("usuario-logado");

    if (usuario && nomeDisplay) {
        nomeDisplay.textContent = `Usuário: ${usuario.nome}`;
    }
});

/* ===============================
   1. DESTACAR TEXTO COM COMENTÁRIO
================================ */
export function destacar() {
    const selecao = window.getSelection();

    if (!selecao.rangeCount || selecao.isCollapsed) {
        alert("Selecione um trecho do texto para comentar.");
        return;
    }

    const textoComentario = prompt("Digite a observação pedagógica:");
    if (!textoComentario) return;

    const seletorCor = document.getElementById("cor");
    const cor = seletorCor ? seletorCor.value : "#fde68a";

    const range = selecao.getRangeAt(0);
    const trecho = range.toString();

    const span = document.createElement("span");
    span.style.backgroundColor = cor;
    span.style.padding = "2px 4px";
    span.style.borderRadius = "4px";
    span.style.cursor = "pointer";
    span.textContent = trecho;

    range.deleteContents();
    range.insertNode(span);
    selecao.removeAllRanges();

    comentarios.push({ trecho, comentario: textoComentario, cor });
    atualizarVisualComentarios();
}

/* ===============================
   2. ATUALIZAR LISTA DE COMENTÁRIOS
================================ */
function atualizarVisualComentarios() {
    const lista = document.getElementById("listaComentarios");
    if (!lista) return;

    if (comentarios.length === 0) {
        lista.innerHTML = '<p style="color:#999;font-style:italic;">Nenhum comentário.</p>';
        return;
    }

    lista.innerHTML = "";
    comentarios.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.style.borderLeft = `4px solid ${c.cor}`;
        div.innerHTML = `
            <small>Trecho:</small>
            <p>"${c.trecho}"</p>
            <strong>${c.comentario}</strong>
        `;
        lista.appendChild(div);
    });
}

/* ===============================
   3. ALUNO – ENVIAR REDAÇÃO
================================ */
/* ===============================
   3. ALUNO – ENVIAR REDAÇÃO (USUÁRIO LOGADO)
================================ */
export async function enviarRedacao() {
    const usuario = obterUsuarioLogado();

    if (!usuario || !usuario.nome) {
        alert("Você precisa estar logado para enviar a redação.");
        return;
    }

    const tituloRedacao = prompt("Título da redação:");
    if (!tituloRedacao) {
        alert("O título é obrigatório.");
        return;
    }

    const editor = document.getElementById("editor");
    if (!editor || editor.innerHTML.trim() === "") {
        alert("A redação está vazia.");
        return;
    }

    const dados = {
        usuario: usuario.nome,   // 🔥 vem direto do login
        titulo: tituloRedacao,
        conteudo_html: editor.innerHTML,
        comentarios
    };

    try {
        const res = await fetch("http://localhost:3000/redacoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!res.ok) throw new Error("Erro ao enviar redação");

        await registrarProgresso(usuario.nome, "redacoesFeitas");

        alert(`✅ Redação enviada com sucesso, ${usuario.nome}!`);
        location.reload();

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao salvar redação no servidor.");
    }
}

/* ===============================
   4. ALUNO – CONSULTAR REDAÇÕES
================================ */
/* ===============================
   4. ALUNO – CONSULTAR REDAÇÕES (USUÁRIO LOGADO)
================================ */
export async function consultarMinhaRedacao() {
    const usuario = obterUsuarioLogado();
    const resultadoDiv = document.getElementById("resultado-consulta");

    if (!usuario || !usuario.nome) {
        alert("Você precisa estar logado.");
        return;
    }

    if (!resultadoDiv) return;

    try {
        const res = await fetch(
            `http://localhost:3000/redacoes/aluno?nome=${encodeURIComponent(usuario.nome)}`
        );

        if (!res.ok) throw new Error("Erro ao buscar redações");

        const redacoes = await res.json();
        resultadoDiv.innerHTML = "";

        if (!redacoes.length) {
            resultadoDiv.innerHTML = "<p>Nenhuma redação encontrada.</p>";
            return;
        }

        resultadoDiv.innerHTML = "<h4>Suas redações:</h4>";

        redacoes.forEach(r => {
            const btn = document.createElement("button");
            btn.className = "btn-consulta";
            btn.textContent = `${r.titulo} (${r.status || "pendente"})`;

            btn.onclick = () => {
                document.getElementById("editor").innerHTML = r.conteudo_html;
                comentarios = r.comentarios || [];
                atualizarVisualComentarios();

                const info = document.getElementById("info-redacao");
                if (info) {
                    info.innerText = `📄 ${r.titulo} - ${r.status || "pendente"}`;
                }
            };

            resultadoDiv.appendChild(btn);
        });

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao consultar redações.");
    }
}

/* ===============================
   5. PROFESSOR – BUSCAR PRÓXIMA
================================ */
export async function buscarProximaFila() {
    try {
        const res = await fetch("http://localhost:3000/redacoes/proxima");

        if (res.status === 404) {
            alert("📭 Nenhuma redação na fila.");
            return;
        }

        const redacao = await res.json();
        idRedacaoAtual = redacao.id;

        document.getElementById("editor").innerHTML = redacao.conteudo_html;
        comentarios = redacao.comentarios || [];
        atualizarVisualComentarios();

        const info = document.getElementById("info-redacao");
        if (info) {
            info.innerText = `🧑‍🏫 Corrigindo: ${redacao.titulo} (${redacao.usuario})`;
        }

    } catch (e) {
        console.error(e);
        alert("Erro ao carregar redação.");
    }
}

/* ===============================
   6. PROFESSOR – SALVAR CORREÇÃO
================================ */
export async function salvarCorrecaoProfessor() {
    if (!idRedacaoAtual) {
        alert("Nenhuma redação selecionada.");
        return;
    }

    const editor = document.getElementById("editor");

    try {
        const res = await fetch(
            `http://localhost:3000/redacoes/corrigir/${idRedacaoAtual}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conteudo_html: editor.innerHTML,
                    comentarios
                })
            }
        );

        if (!res.ok) throw new Error();

        alert("✅ Correção salva com sucesso!");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("Erro ao salvar correção.");
    }
}
