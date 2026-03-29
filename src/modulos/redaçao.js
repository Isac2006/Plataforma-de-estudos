import { registrarProgresso } from './estatisticas.js';

// ========================
// ESTADO DO MÓDULO
// ========================
let comentarios = [];
let idRedacaoAtual = null;

// ========================
// 1. DESTACAR TRECHO
// ========================
export function destacar() {
    const selecao = window.getSelection();

    if (!selecao.rangeCount || selecao.isCollapsed) {
        alert("Selecione um trecho do texto para comentar.");
        return;
    }

    const textoComentario = prompt("Digite a observação pedagógica:");
    if (!textoComentario) return;

    const cor = document.getElementById("cor")?.value || "#fde68a";
    const range = selecao.getRangeAt(0);
    const trecho = range.toString();

    const span = document.createElement("span");
    span.style.backgroundColor = cor;
    span.style.padding = "2px 3px";
    span.style.borderRadius = "4px";
    span.textContent = trecho;

    range.deleteContents();
    range.insertNode(span);
    selecao.removeAllRanges();

    comentarios.push({ trecho, comentario: textoComentario, cor });
    atualizarVisualComentarios();
}

// ========================
// 2. LISTA DE COMENTÁRIOS
// ========================
function atualizarVisualComentarios() {
    const lista = document.getElementById("listaComentarios");
    if (!lista) return;

    if (comentarios.length === 0) {
        lista.innerHTML = `<p class="comentario-vazio">Nenhum comentário.</p>`;
        return;
    }

    lista.innerHTML = "";
    comentarios.forEach(c => {
        const div = document.createElement("div");
        div.className = "comment";
        div.style.borderLeft = `4px solid ${c.cor}`;
        div.innerHTML = `
            <span class="trecho">"${c.trecho}"</span>
            <p>${c.comentario}</p>
        `;
        lista.appendChild(div);
    });
}

// ========================
// 3. ALUNO — ENVIAR REDAÇÃO
// ========================
export async function enviarRedacao() {
    const nomeAluno = prompt("Digite seu nome completo:");
    const tituloRedacao = prompt("Título da redação:");

    if (!nomeAluno || !tituloRedacao) {
        alert("Nome e título são obrigatórios.");
        return;
    }

    const editor = document.getElementById("editor");
    if (!editor || editor.innerHTML.trim() === "") {
        alert("Escreva sua redação antes de enviar.");
        return;
    }

    const dados = {
        usuario: nomeAluno,
        titulo: tituloRedacao,
        conteudo_html: editor.innerHTML,
        comentarios // ✅ mantém os comentários
    };

    try {
        const res = await fetch("http://localhost:3000/redacoes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (!res.ok) {
            throw new Error("Erro ao enviar redação");
        }

        await registrarProgresso(nomeAluno, "redacoesFeitas");
        alert(`✅ ${nomeAluno}, sua redação foi enviada com sucesso!`);
        location.reload();

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao conectar ou salvar no servidor.");
    }
}

// ========================
// 4. CONSULTAR REDAÇÕES DO ALUNO
// ========================
export async function consultarMinhaRedacao() {
    const nome = document.getElementById("consulta-nome")?.value.trim();
    const resultadoDiv = document.getElementById("resultado-consulta");

    if (!nome) return alert("Digite seu nome!");
    if (!resultadoDiv) {
        alert("Elemento de resultado não encontrado no HTML.");
        return;
    }

    try {
        const response = await fetch(
            `http://localhost:3000/redacoes/aluno?nome=${encodeURIComponent(nome)}`
        );

        if (!response.ok) {
            throw new Error("Erro ao buscar redações");
        }

        const redacoes = await response.json();
        resultadoDiv.innerHTML = "";

        if (!redacoes.length) {
            resultadoDiv.innerHTML = "<p>Nenhuma redação encontrada.</p>";
            return;
        }

        resultadoDiv.innerHTML = "<h4>Suas redações:</h4>";

        redacoes.forEach(r => {
            const btn = document.createElement("button");
            btn.className = "btn-consulta";
            btn.textContent = `${r.titulo} — ${r.status}`;

            btn.onclick = () => {
                document.getElementById("editor").innerHTML = r.conteudo_html;
                comentarios = r.comentarios || [];
                atualizarVisualComentarios();
                document.getElementById("info-redacao").innerText =
                    `📄 ${r.titulo} (${r.status})`;
            };

            resultadoDiv.appendChild(btn);
        });

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao buscar redações.");
    }
}

// ========================
// 5. PROFESSOR — PRÓXIMA DA FILA
// ========================
export async function buscarProximaFila() {
    try {
        const res = await fetch("http://localhost:3000/redacoes/proxima");

        if (res.status === 404) {
            alert("Fila vazia!");
            return;
        }

        if (!res.ok) {
            throw new Error("Erro ao buscar próxima redação");
        }

        const redacao = await res.json();
        idRedacaoAtual = redacao.id;

        document.getElementById("editor").innerHTML = redacao.conteudo_html;
        document.getElementById("info-redacao").innerText =
            `🧐 Corrigindo: ${redacao.titulo} (${redacao.usuario})`;

        comentarios = redacao.comentarios || [];
        atualizarVisualComentarios();

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao carregar redação.");
    }
}

// ========================
// 6. PROFESSOR — SALVAR CORREÇÃO
// ========================
export async function salvarCorrecaoProfessor() {
    if (!idRedacaoAtual) {
        alert("Nenhuma redação selecionada.");
        return;
    }

    const dados = {
        conteudo_html: document.getElementById("editor").innerHTML,
        comentarios
    };

    try {
        const res = await fetch(
            `http://localhost:3000/redacoes/corrigir/${idRedacaoAtual}`,
            {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dados)
            }
        );

        if (!res.ok) {
            throw new Error("Erro ao salvar correção");
        }

        alert("✅ Correção salva com sucesso!");
        location.reload();

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao salvar correção.");
    }
}
