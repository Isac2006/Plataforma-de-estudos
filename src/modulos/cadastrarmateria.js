document.addEventListener("DOMContentLoaded", () => {

const modal = document.getElementById("modal-imagem");
const inputFile = document.getElementById("modal-input-file");
const inputUrl = document.getElementById("modal-input-url");
const preview = document.querySelector(".modal-preview");

if (inputFile && preview) {

inputFile.addEventListener("change", function() {

    const file = this.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {

        imagemSelecionada = e.target.result;

        preview.innerHTML =
        `<img src="${imagemSelecionada}">`;

    };

    reader.readAsDataURL(file);

});

}

if (inputUrl && preview) {

inputUrl.addEventListener("input", function() {

    if (!this.value.trim()) return;

    imagemSelecionada = this.value.trim();

    preview.innerHTML =
    `<img src="${imagemSelecionada}">`;

});

}

const btnInserir =
document.getElementById("modal-inserir");

if (btnInserir){

btnInserir.addEventListener("click", () => {

    if (!imagemSelecionada || !editorAtivo) return;

    const img = document.createElement("img");

    img.src = imagemSelecionada;
    img.style.maxWidth = "100%";
    img.style.cursor = "pointer";
    img.title = "Clique para remover";

    img.addEventListener("click", () => img.remove());

    editorAtivo.focus();

    // garante quebra antes da imagem
editorAtivo.appendChild(document.createElement("br"));

// adiciona imagem no final
editorAtivo.appendChild(img);

// quebra depois da imagem
editorAtivo.appendChild(document.createElement("br"));

// coloca cursor no final
const range = document.createRange();
const sel = window.getSelection();

range.selectNodeContents(editorAtivo);
range.collapse(false);

sel.removeAllRanges();
sel.addRange(range);

    fecharModal();

});

}

const btnCancelar =
document.getElementById("modal-cancelar");

if(btnCancelar){

btnCancelar.addEventListener("click", fecharModal);

}

});

document.addEventListener("DOMContentLoaded", () => {

    const btnAddSecao = document.getElementById("btn-add-secao");
    const containerSecoes = document.getElementById("container-secoes");

    // ➕ Nova Seção
    if (btnAddSecao) {
        btnAddSecao.addEventListener("click", () => {

            const novaSecao = document.createElement("div");
novaSecao.classList.add("secao-item");

novaSecao.innerHTML = `
    <button type="button" class="btn-remover-secao">✖</button>

    <div class="grupo-campo">
        <label>📌 Título da Seção</label>
        <input type="text" class="secao-titulo" placeholder="Digite o título da seção">
    </div>

    <div class="editor-container">

        <div class="editor-toolbar">
            <button type="button" data-action="bold"><b>Negrito</b></button>
            <button type="button" data-action="italic"><i>Italico</i></button>
            <button type="button" class="btn-add-img">Imagem</button>
        </div>

        <div class="secao-editor" contenteditable="true">
        </div>

    </div>

    <div class="preview-imagens-secao"></div>
`;

            containerSecoes.appendChild(novaSecao);
        });
    }

});

// ❌ Remover seção
document.addEventListener("click", (e) => {

    const botaoRemover = e.target.closest(".btn-remover-secao");
    if (!botaoRemover) return;

    const secao = botaoRemover.closest(".secao-item");
    if (!secao) return;

    // Opcional: impedir remover se for a única
    const totalSecoes = document.querySelectorAll(".secao-item").length;

    if (totalSecoes <= 1) {
        alert("⚠️ Deve existir pelo menos uma seção.");
        return;
    }

    secao.remove();

});

let editorAtivo = null;
let imagemSelecionada = null;

function fecharModal() {

    const modal = document.getElementById("modal-imagem");

    if (modal) {
        modal.classList.add("hidden");
    }

    // limpa preview
    const preview = document.querySelector(".modal-preview");

    if (preview) {
        preview.innerHTML = "";
    }

    // limpa inputs
    const inputFile = document.getElementById("modal-input-file");
    const inputUrl = document.getElementById("modal-input-url");

    if (inputFile) inputFile.value = "";
    if (inputUrl) inputUrl.value = "";

    imagemSelecionada = null;
    editorAtivo = null;
}

// Toolbar ações
document.addEventListener("click", (e) => {

    const botao = e.target.closest("button, .btn-add-img");    if (!botao) return;

    // 🔥 AÇÃO DO EDITOR
    const action = botao.dataset.action;

    if (action) {

        e.preventDefault();

        const editor = botao
            .closest(".editor-container")
            ?.querySelector(".secao-editor");

        if (!editor) return;

        editor.focus();

        if (action === "bold") {
            document.execCommand("bold");
        }

        if (action === "italic") {
            document.execCommand("italic");
        }

        if (action === "h2") {
            document.execCommand("formatBlock", false, "h2");
        }
    }

    // 🖼 Abrir modal imagem
    if (botao.classList.contains("btn-add-img")) {

editorAtivo = botao
.closest(".editor-container")
.querySelector(".secao-editor");

const modal =
document.getElementById("modal-imagem");

if(modal){
modal.classList.remove("hidden");
}

}

});

// 🔥 Reset seguro do editor
document.addEventListener("input", (e) => {

    if (!e.target.classList.contains("secao-editor")) return;

    const editor = e.target;

    const temTexto = editor.innerText.trim() !== "";
    const temImagem = editor.querySelector("img") !== null;

    // Só resetar se não houver texto E não houver imagem
    if (!temTexto && !temImagem) {

        editor.innerHTML = "";

        // Força reset do estado interno do navegador
        const span = document.createElement("span");
        span.innerHTML = "&#8203;"; // zero-width space
        editor.appendChild(span);

        const range = document.createRange();
        const sel = window.getSelection();

        range.setStart(span.firstChild, 0);
        range.collapse(true);

        sel.removeAllRanges();
        sel.addRange(range);

    }

});

export async function cadastrarMateria() {

    const disciplinaEl = document.getElementById("materia-disciplina");
    const temaEl = document.getElementById("materia-tema");
    const resumoEl = document.getElementById("materia-resumo");

    if (!disciplinaEl || !temaEl || !resumoEl) {
        console.error("❌ Elementos obrigatórios não encontrados");
        return;
    }

    if (
        !disciplinaEl.value.trim() ||
        !temaEl.value.trim() ||
        !resumoEl.value.trim()
    ) {
        exibirMensagem("⚠️ Preencha todos os campos obrigatórios.", "erro");
        return;
    }

    const secoes = coletarSecoes();

    if (secoes.length === 0) {
        exibirMensagem("⚠️ Adicione pelo menos uma seção.", "erro");
        return;
    }

    const dados = {
        disciplina: disciplinaEl.value.trim(),
        tema: formatarTema(temaEl.value.trim()),
        resumo: resumoEl.value.trim(),
        secoes
    };

    try {

        const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

        if (!usuario) {
            exibirMensagem("⚠️ Usuário não autenticado.", "erro");
            return;
        }

        const res = await fetch("http://localhost:3000/materias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...dados,
                usuarioId: usuario.id
            })
        });

        if (!res.ok) {
            const erroServidor = await res.json();
            throw new Error(erroServidor.erro || "Erro no servidor");
        }

        salvarMateriaLocal(dados);
        exibirMensagem("✅ Matéria cadastrada com sucesso!", "sucesso");
        limparFormularioMateria();

    } catch (erro) {
        console.error("❌ ERRO DO BACKEND:", erro.message);
        exibirMensagem("❌ Erro ao conectar com o servidor: " + erro.message, "erro");
    }
}

function coletarSecoes() {

    const secoes = [];
    const secoesDOM = document.querySelectorAll(".secao-item");

    secoesDOM.forEach(secao => {

        const titulo = secao.querySelector(".secao-titulo").value.trim();
        const editor = secao.querySelector(".secao-editor");
        const conteudo = editor.innerHTML.trim();

        if (titulo && conteudo) {
            secoes.push({
                titulo,
                conteudo
            });
        }
    });

    return secoes;
}

export function inserirImagemNoTexto(urlImagem) {
    if (!urlImagem) return;

    const textarea = document.activeElement;

    if (!textarea || !textarea.classList.contains("secao-conteudo")) {
        exibirMensagem("⚠️ Clique dentro do conteúdo da seção antes de inserir imagem.", "erro");
        return;
    }

    const tagImagem = `\n<img src="${urlImagem}">\n`;

    const inicio = textarea.selectionStart;
    const fim = textarea.selectionEnd;

    textarea.value =
        textarea.value.substring(0, inicio) +
        tagImagem +
        textarea.value.substring(fim);

    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd =
        inicio + tagImagem.length;
}

/* =========================
   FUNÇÕES AUXILIARES
========================= */

function formatarTema(texto) {
    return texto
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

function salvarMateriaLocal(materia) {
    const materias = JSON.parse(localStorage.getItem("materias")) || [];
    materias.push(materia);
    localStorage.setItem("materias", JSON.stringify(materias));
}

function limparFormularioMateria() {

    // 🔹 Limpa campos principais
    document.getElementById("materia-disciplina").value = "";
    document.getElementById("materia-tema").value = "";
    document.getElementById("materia-resumo").value = "";

    const containerSecoes = document.getElementById("container-secoes");

    if (!containerSecoes) return;

    // 🔥 Remove TODAS as seções
    containerSecoes.innerHTML = "";

    // 🔥 Cria uma seção nova padrão
    const novaSecao = document.createElement("div");
    novaSecao.classList.add("secao-item");

    novaSecao.innerHTML = `
        <button type="button" class="btn-remover-secao">✖</button>

        <div class="grupo-campo">
            <label>📌 Título da Seção</label>
            <input type="text" class="secao-titulo" placeholder="Digite o título da seção">
        </div>

        <div class="editor-container">
            <div class="editor-toolbar">
                <button type="button" data-action="bold"><b>Negrito</b></button>
                <button type="button" data-action="italic"><i>Itálico</i></button>
                <button type="button" class="btn-add-img">Imagem</button>
            </div>

            <div class="secao-editor" contenteditable="true"></div>
        </div>
    `;

    containerSecoes.appendChild(novaSecao);
}

function exibirMensagem(texto, tipo = "erro") {
    const msg = document.getElementById("mensagem-topo");
    if (!msg) return;

    msg.textContent = texto;
    msg.style.display = "block";

    if (tipo === "sucesso") {
        msg.style.background = "#e5ffe5";
        msg.style.color = "#006400";
        msg.style.border = "1px solid #9be59b";
    } else {
        msg.style.background = "#ffe5e5";
        msg.style.color = "#a10000";
        msg.style.border = "1px solid #ffb3b3";
    }

    setTimeout(() => {
        msg.style.display = "none";
    }, 4000);
}