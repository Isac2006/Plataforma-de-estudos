const API_BASE = "http://localhost:3000";

async function apiFetch(endpoint) {
    const res = await fetch(`${API_BASE}${endpoint}`);
    if (!res.ok) throw new Error("Erro na API");
    return await res.json();
}

function formatarTema(texto) {
    if (!texto) return "";

    return texto
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

function pegarIdDaURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
}

function processarConteudo(conteudo) {
    if (!conteudo || conteudo.trim() === "") {
        return "<p>Sem conteúdo disponível.</p>";
    }
    return conteudo;
}

async function carregarMateria() {

    const id = pegarIdDaURL();
    const container = document.getElementById("conteudo-materia");
console.log("Buscando:", `/materias/${id}`);
    if (!id) {
        container.innerHTML = "<p>Matéria não encontrada.</p>";
        return;
    }

    try {

        const materia = await apiFetch(`/materias/${id}`);

        // 🔥 Montar seções dinamicamente
        let secoesHTML = "";

        if (materia.secoes && materia.secoes.length > 0) {
            materia.secoes.forEach((secao, index) => {
    secoesHTML += `
        <div class="secao-detalhe" id="secao-${index}">
            <h2>${secao.titulo}</h2>
            <div class="secao-conteudo-detalhe">
                ${processarConteudo(secao.conteudo)}
            </div>
        </div>
    `;
});
        } else {
            secoesHTML = "<p>Sem conteúdo disponível.</p>";
        }

        container.innerHTML = `
    <div class="materia-layout">

        <!-- CONTEÚDO PRINCIPAL -->
        <div class="materia-main">

            <div class="materia-wrapper">

                <!-- Breadcrumb -->
<div class="breadcrumb">
    <a href="modulos.html?disciplina=${encodeURIComponent(materia.disciplina.toLowerCase())}"        
    class="breadcrumb-link">
        📚 ${materia.disciplina || "Disciplina"}
    </a>

    <span class="divider">›</span>

    <a href="materia-detalhe.html?id=${materia.id}" 
       class="breadcrumb-link">
        ${formatarTema(materia.tema)}
    </a>
</div>

                <!-- Cabeçalho -->
                <div class="materia-header">
                    <h1>${formatarTema(materia.tema)}</h1>

                    <div class="acoes-materia">
                        <button class="btn-acao">⭐ Favoritar</button>
                        <button class="btn-acao-outline">📌 Marcar como concluído</button>
                    </div>
                </div>

                <!-- Card principal -->
                <section class="materia-card">

                    <div class="resumo-destaque">
                        <button id="toggle-resumo" class="btn-toggle-resumo">
                            📄 Ocultar Resumo
                        </button>

                        <div id="resumo-box">
                            <p>${materia.resumo || "Sem resumo disponível."}</p>
                        </div>
                    </div>

                    <div class="conteudo-completo">
                        ${secoesHTML}
                    </div>

                </section>

            </div>

        </div>

        <!-- SIDEBAR DIREITA -->
        <aside class="materia-sidebar">
            <h3>📑 Conteúdo</h3>
            ${gerarLinksNavegacao(materia.secoes)}
        </aside>

    </div>
`;

        // 🔥 Toggle resumo
        const btn = document.getElementById("toggle-resumo");
        const box = document.getElementById("resumo-box");

        if (btn && box) {
            btn.addEventListener("click", () => {

                if (box.style.display === "none") {
                    box.style.display = "block";
                    btn.textContent = "📄 Ocultar Resumo";
                } else {
                    box.style.display = "none";
                    btn.textContent = "📄 Ver Resumo";
                }

            });
        }

    } catch (e) {
        console.error(e);
        container.innerHTML = "<p>Erro ao carregar matéria.</p>";
    }
}

function gerarLinksNavegacao(secoes) {
    if (!secoes || secoes.length === 0) return "<p>Sem seções</p>";

    return secoes.map((secao, index) => `
        <a href="#secao-${index}">
            ${secao.titulo}
        </a>
    `).join("");
}

document.addEventListener("DOMContentLoaded", carregarMateria);