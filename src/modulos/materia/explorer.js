import { normalizarTexto } from "./utils.js";
import { obterUsuarioLogado } from "../../auth.js";

let listaDisciplinasExplorer;
let listaModulosExplorer;
let materiasExplorer = []; // guarda todos os módulos/matérias carregadas

// 🔑 usuarioId reutilizado em todas as requisições protegidas
const usuario = obterUsuarioLogado();
const usuarioId = usuario?.id;

/* ==========================================
   CARREGAR DISCIPLINAS
========================================== */
export async function carregarDisciplinasExplorer() {
    const r = await fetch("/disciplinas");
    const disciplinas = await r.json();

    if (!listaDisciplinasExplorer) return;
    listaDisciplinasExplorer.innerHTML = "";

    disciplinas.forEach(d => {
        const div = document.createElement("div");
        div.className = "item-disciplina";
        div.textContent = d;
        div.onclick = () => carregarModulosDisciplina(d);
        listaDisciplinasExplorer.appendChild(div);
    });
}

/* ==========================================
   CARREGAR MODULOS/MATERIAS
========================================== */
async function carregarModulosDisciplina(disciplina) {
    // ✅ usuarioId adicionado — rota usa middleware apenasAutorizado
    const r = await fetch(`/modulos?disciplina=${encodeURIComponent(disciplina)}&usuarioId=${usuarioId}`);

    if (!r.ok) {
        console.error("Erro ao carregar módulos:", r.status);
        return;
    }

    const modulos = await r.json();

    console.log("DISCIPLINA:", disciplina);
    console.log("MODULOS:", modulos);

    materiasExplorer = modulos; // salva para pesquisa

    if (listaDisciplinasExplorer) listaDisciplinasExplorer.style.display = "none";
    if (listaModulosExplorer) listaModulosExplorer.style.display = "flex";

    const btnVoltar = document.getElementById("btn-voltar");
    if (btnVoltar) btnVoltar.classList.remove("hidden");

    renderizarModulos(modulos);
}

function renderizarModulos(modulos) {
    listaModulosExplorer.innerHTML = "";

    modulos.forEach(m => {
        const div = document.createElement("div");
        div.className = "item-modulo";
        div.textContent = m.tema;
        div.onclick = () => abrirModulo(m);
        listaModulosExplorer.appendChild(div);
    });
}

/* ==========================================
   PESQUISA DE MATERIAS/MODULOS
========================================== */
export function iniciarPesquisaModulosExplorer() {
    const input = document.getElementById("busca-disciplina");
    if (!input) return;

    input.addEventListener("input", () => {
        const filtro = normalizarTexto(input.value);

        const filtrados = materiasExplorer.filter(m =>
            normalizarTexto(m.tema).includes(filtro)
        );

        renderizarModulos(filtrados);
    });
}

/* ==========================================
   ABRIR MODULO
========================================== */
async function abrirModulo(modulo) {
    document.getElementById("explorer-vazio").classList.add("hidden");
    document.getElementById("explorer-conteudo").classList.remove("hidden");

    document.getElementById("video1").src = "";
    document.getElementById("video2").src = "";
    document.getElementById("video2").classList.add("hidden");

    document.getElementById("explorer-titulo").textContent = modulo.tema;

    document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
    document.querySelector('[data-aba="video"]').classList.add("ativa");
    document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
    document.getElementById("aba-video").classList.add("ativa");

    // Buscar resumo — /materias é rota livre, não precisa de usuarioId
    const rMaterias = await fetch("/materias");
    const materias = await rMaterias.json();

    const materia = materias.find(m =>
        normalizarTexto(m.tema) === normalizarTexto(modulo.tema) &&
        normalizarTexto(m.disciplina) === normalizarTexto(modulo.disciplina)
    );

    document.getElementById("explorer-resumo").innerHTML =
        materia?.resumo || "Resumo não disponível";

    // Buscar aulas — ✅ usuarioId adicionado
    const video1 = document.getElementById("video1");
    const video2 = document.getElementById("video2");
    const status = document.getElementById("explorer-status") || { textContent: "" };

    const rAulas = await fetch(`/modulos?usuarioId=${usuarioId}`);
    const todasAulas = rAulas.ok ? await rAulas.json() : [];

    const aula = todasAulas.find(m =>
        normalizarTexto(m.disciplina) === normalizarTexto(modulo.disciplina) &&
        normalizarTexto(m.tema) === normalizarTexto(modulo.tema)
    );

    const url1 = aula?.aula_url ? converterParaEmbed(aula.aula_url) : "";
    const url2 = aula?.aula_url_2 ? converterParaEmbed(aula.aula_url_2) : "";

    video1.src = url1;
    if (url2) {
        video2.src = url2;
        video2.classList.remove("hidden");
    } else {
        video2.src = "";
        video2.classList.add("hidden");
    }

    status.textContent = aula ? "Aula carregada com sucesso ✅" : "Aula não encontrada";

    // Buscar questões — ✅ usuarioId adicionado
    if (modulo.questoes_ids?.length) {
        const rQuestoes = await fetch(
            `/api/questoes?ids=${modulo.questoes_ids.join(",")}&usuarioId=${usuarioId}`
        );

        if (rQuestoes.ok) {
            const questoes = await rQuestoes.json();
            renderizarQuestoesExplorer(questoes);
        } else {
            console.error("Erro ao buscar questões:", rQuestoes.status);
        }
    }
}

/* ==========================================
   FUNÇÃO AUXILIAR VIDEO
========================================== */
function converterParaEmbed(url) {
    if (!url) return "";
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
}

/* ==========================================
   RENDER QUESTOES
========================================== */
function renderizarQuestoesExplorer(questoes) {
    const container = document.getElementById("explorer-questoes");
    if (!container) return;
    container.innerHTML = "";

    questoes.forEach((q, index) => {
        const div = document.createElement("div");
        div.className = "questao-card";

        const letras = ["A", "B", "C", "D"];

        div.innerHTML = `
            <h3>Questão ${index + 1}</h3>
            <p class="enunciado">${q.enunciado}</p>
            <ul class="lista-alternativas">
                ${letras.map((letra, i) => `
                    <li class="alternativa" data-letra="${letra}">
                        <strong>${letra})</strong> ${q.alternativas?.[i] || ""}
                    </li>
                `).join("")}
            </ul>
            <div class="explicacao hidden">
                <strong>📘 Explicação:</strong>
                <p>${q.explicacao || "Sem explicação cadastrada."}</p>
            </div>
        `;

        const alternativas = div.querySelectorAll(".alternativa");
        const explicacao = div.querySelector(".explicacao");

        alternativas.forEach(alt => {
            alt.addEventListener("click", async () => {
                if (div.classList.contains("respondida")) return;
                div.classList.add("respondida");

                const letraEscolhida = alt.dataset.letra;
                const correta = q.resposta_correta;
                const acertou = letraEscolhida === correta;

                alternativas.forEach(a => {
                    const letra = a.dataset.letra;
                    if (letra === correta) a.classList.add("correta");
                    if (letra === letraEscolhida && letra !== correta) a.classList.add("errada");
                });

                explicacao.classList.remove("hidden");

                // ✅ Usa obterUsuarioLogado() em vez de localStorage direto
                try {
                    if (!usuario?.nome) return;

                    await fetch("/usuario/registrar-resposta", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            usuario: usuario.nome,
                            disciplina: q.disciplina,
                            acertou,
                            questao_id: q.id || null
                        })
                    });
                    console.log("📊 Estatística registrada");
                } catch (e) {
                    console.error("Erro ao registrar resposta", e);
                }
            });
        });

        container.appendChild(div);
    });
}

/* ==========================================
   ABAS
========================================== */
export function iniciarAbasExplorer() {
    document.querySelectorAll(".aba-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".aba-btn").forEach(b => b.classList.remove("ativa"));
            btn.classList.add("ativa");
            document.querySelectorAll(".aba").forEach(a => a.classList.remove("ativa"));
            const id = "aba-" + btn.dataset.aba;
            document.getElementById(id).classList.add("ativa");
        });
    });
}

/* ==========================================
   BOTÃO VOLTAR
========================================== */
export function iniciarBotaoVoltar() {
    const btnVoltar = document.getElementById("btn-voltar");
    if (!btnVoltar) return;

    btnVoltar.onclick = () => {
        document.getElementById("lista-disciplinas").style.display = "flex";
        document.getElementById("lista-materias").style.display = "none";
        btnVoltar.classList.add("hidden");
    };
}

/* ==========================================
   INICIAR EXPLORER
========================================== */
export function iniciarExplorer() {
    listaDisciplinasExplorer = document.getElementById("lista-disciplinas");
    listaModulosExplorer = document.getElementById("lista-materias");

    carregarDisciplinasExplorer();
    iniciarAbasExplorer();
    iniciarBotaoVoltar();
    iniciarPesquisaModulosExplorer();
}