// ========================
// FUNÇÕES AUXILIARES
// ========================

function urlValida(url) {
    try {
        const u = new URL(url.trim());
        return u.protocol === "http:" || u.protocol === "https:";
    } catch {
        return false;
    }
}

function escapeHTML(texto) {
    const div = document.createElement("div");
    div.innerText = texto;
    return div.innerHTML;
}

// ========================
// 1. SORTEAR TEMA ALEATÓRIO
// ========================
export async function sortearTema() {
    const container = document.getElementById("tema-container");
    const btnSortear = document.getElementById("btnSortearTema");

    if (!container) return;
    if (btnSortear) btnSortear.disabled = true;

    try {
        const res = await fetch("http://localhost:3000/redacao/temas/aleatorio");

        if (res.status === 404) {
            container.innerHTML = `<p class="tema-vazio">Nenhum tema cadastrado ainda.</p>`;
            return;
        }

        if (!res.ok) throw new Error("Erro ao buscar tema");

        const tema = await res.json();
        renderizarTema(tema);

    } catch (e) {
        console.error(e);
        container.innerHTML = `<p class="tema-erro">❌ Erro ao carregar tema.</p>`;
    } finally {
        if (btnSortear) btnSortear.disabled = false;
    }
}

// ========================
// RENDERIZAR TEMA
// ========================
function renderizarTema(t) {
    const container = document.getElementById("tema-container");

    const imagens = [t.imagem1, t.imagem2].filter(img => img && urlValida(img));

    const imagensHtml = imagens.length
        ? `<div class="tema-imagens">
            ${imagens.map((img, i) => `
                <img
                    src="${img.trim()}"
                    alt="Imagem ${i + 1}"
                    class="tema-img"
                    style="max-width:300px; display:block; margin:10px auto;"
                    onerror="this.style.border='2px solid red'"
                />
            `).join("")}
           </div>`
        : "";

    container.innerHTML = `
        <div class="tema-card">
            <h3 class="tema-titulo">📌 ${escapeHTML(t.tema)}</h3>

            <div class="tema-textos">
                <div class="tema-texto">
                    <span class="tema-label">Texto de apoio 1</span>
                    <p>${escapeHTML(t.texto1)}</p>
                </div>

                ${t.texto2 ? `
                    <div class="tema-texto">
                        <span class="tema-label">Texto de apoio 2</span>
                        <p>${escapeHTML(t.texto2)}</p>
                    </div>
                ` : ""}

                ${t.texto3 ? `
                    <div class="tema-texto">
                        <span class="tema-label">Texto de apoio 3</span>
                        <p>${escapeHTML(t.texto3)}</p>
                    </div>
                ` : ""}
            </div>

            ${imagensHtml}
        </div>
    `;
}

// ========================
// 2. CADASTRAR TEMA
// ========================
export async function cadastrarTema() {
    const tema    = document.getElementById("input-tema")?.value.trim();
    const texto1  = document.getElementById("input-texto1")?.value.trim();
    const texto2  = document.getElementById("input-texto2")?.value.trim();
    const texto3  = document.getElementById("input-texto3")?.value.trim();
    const imagem1 = document.getElementById("input-imagem1")?.value.trim();
    const imagem2 = document.getElementById("input-imagem2")?.value.trim();

    if (!tema || !texto1) {
        alert("Preencha ao menos o Tema e o Texto 1.");
        return;
    }

    if (imagem1 && !urlValida(imagem1)) {
        alert("Imagem 1 inválida (URL incorreta).");
        return;
    }

    if (imagem2 && !urlValida(imagem2)) {
        alert("Imagem 2 inválida (URL incorreta).");
        return;
    }

    try {
        const res = await fetch("http://localhost:3000/redacao/temas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tema, texto1, texto2, texto3, imagem1, imagem2 })
        });

        const resposta = await res.json();
        if (!res.ok) throw new Error(resposta.mensagem);

        alert("✅ Tema cadastrado com sucesso!");
        limparFormularioTema();
        await listarTemasProfessor();

    } catch (e) {
        console.error(e);
        alert("❌ Erro ao cadastrar tema.");
    }
}

// ========================
// LIMPAR FORMULÁRIO
// ========================
function limparFormularioTema() {
    ["input-tema", "input-texto1", "input-texto2", "input-texto3", "input-imagem1", "input-imagem2"]
        .forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = "";
        });
}

// ========================
// 3. LISTAR TEMAS
// ========================
export async function listarTemasProfessor() {
    const lista = document.getElementById("lista-temas-professor");
    if (!lista) return;

    try {
        const res = await fetch("http://localhost:3000/redacao/temas");
        const temas = await res.json();

        if (!temas.length) {
            lista.innerHTML = `<p class="tema-vazio">Nenhum tema cadastrado.</p>`;
            return;
        }

        lista.innerHTML = temas.map(t => `
            <div class="tema-item-professor">
                <span>${escapeHTML(t.tema)}</span>
                <button onclick="window._excluirTema(${t.id})" class="btn-excluir-tema">
                    🗑️ Excluir
                </button>
            </div>
        `).join("");

    } catch (e) {
        console.error(e);
        lista.innerHTML = `<p class="tema-erro">Erro ao listar temas.</p>`;
    }
}

// ========================
// 4. EXCLUIR TEMA
// ========================
window._excluirTema = async (id) => {
    if (!confirm("Excluir este tema?")) return;

    try {
        await fetch(`http://localhost:3000/redacao/temas/${id}`, {
            method: "DELETE"
        });
        await listarTemasProfessor();

    } catch (e) {
        console.error(e);
        alert("Erro ao excluir tema.");
    }
};