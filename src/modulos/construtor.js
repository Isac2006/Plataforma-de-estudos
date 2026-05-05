import { obterUsuarioLogado } from "../auth.js";

/* ===============================
   ESTADO LOCAL
================================ */
let questoesDisponiveis = [];
let questoesAtuaisDoModulo = [];
async function buscarAulas(materia, tema) {
    try {
        const res = await fetch(
            `http://localhost:3000/aulas/buscar?disciplina=${encodeURIComponent(materia)}&tema=${encodeURIComponent(tema)}`
        );

        if (!res.ok) throw new Error("Erro ao buscar aulas");

        const aula = await res.json();

        // Preenche os inputs automaticamente
        document.getElementById("aula1").value = aula.aula_url || "";
        document.getElementById("aula2").value = aula.aula_url_2 || "";

    } catch (err) {
        console.error("Erro ao buscar aulas:", err);
    }
}
/* ===============================
   BUSCAR QUESTÕES
================================ */
export async function buscarDadosParaModulo() {

    const materia = document.getElementById("selectMateria")?.value;
    const tema = document.getElementById("selectTema")?.value;

    if (!materia || !tema) return;

    try {
        const res = await fetch(
            `http://localhost:3000/construtor/dados?disciplina=${encodeURIComponent(materia)}&tema=${encodeURIComponent(tema)}`
        );

        if (!res.ok) {
            const erro = await res.text();
            throw new Error(erro || "Erro ao buscar dados");
        }

        const dados = await res.json();
        questoesDisponiveis = dados.questoes || [];
        renderizarSelecaoQuestoes(questoesDisponiveis);

    } catch (err) {
        console.error("❌ Erro ao buscar dados do módulo:", err);
    }
}

/* ===============================
   RENDERIZA QUESTÕES
================================ */
function renderizarSelecaoQuestoes(questoes) {
    const container = document.getElementById("selectQuestoes");
    if (!container) return;

    container.innerHTML = "";

    if (!questoes.length) {
        container.innerHTML = `<p>Nenhuma questão encontrada</p>`;
        return;
    }

    questoes.forEach(q => {
        const label = document.createElement("label");
        label.style.cssText = "display:flex; gap:10px; align-items:flex-start; padding:8px; border-bottom:1px solid #eee; cursor:pointer;";

        label.innerHTML = `
            <input 
                type="checkbox" 
                value="${q.id}" 
                style="margin-top:3px; width:16px; height:16px; cursor:pointer;"
            >
            <span>
                <strong>Q${q.id}</strong> — ${q.enunciado.substring(0, 80)}...
            </span>
        `;

        container.appendChild(label);
    });

    // Botão para marcar/desmarcar todas
    const btnTodas = document.createElement("button");
    btnTodas.type = "button";
    btnTodas.textContent = "✅ Selecionar todas";
    btnTodas.style.cssText = "margin-top:10px; padding:6px 12px; cursor:pointer;";
    btnTodas.onclick = () => {
        const checks = container.querySelectorAll("input[type=checkbox]");
        const todasMarcadas = Array.from(checks).every(c => c.checked);
        checks.forEach(c => c.checked = !todasMarcadas);
        btnTodas.textContent = todasMarcadas ? "✅ Selecionar todas" : "❌ Desmarcar todas";
    };

    container.appendChild(btnTodas);
}

/* ===============================
   SALVAR MÓDULO
================================ */
export async function finalizarModulo() {
    const usuario = obterUsuarioLogado();

    if (!usuario || usuario.tipo !== "professor") {
        alert("Apenas professores podem criar módulos.");
        return;
    }

    const materia = document.getElementById("selectMateria")?.value;
    const tema    = document.getElementById("selectTema")?.value;

    // ✅ Pega os checkboxes marcados
    const container = document.getElementById("selectQuestoes");
    const questoesSelecionadas = Array.from(
        container.querySelectorAll("input[type=checkbox]:checked")
    ).map(cb => cb.value);

    if (!materia || !tema) {
        alert("Selecione a matéria e o tema.");
        return;
    }

    if (questoesSelecionadas.length === 0) {
        alert("Selecione ao menos uma questão.");
        return;
    }

    const aula_url_1 = document.getElementById("aula1")?.value.trim() || "";
    const aula_url_2 = document.getElementById("aula2")?.value.trim() || "";
    const resumo     = document.getElementById("resumo")?.value.trim() || "";

    function converterParaEmbed(url) {
        if (!url) return "";
        if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
        if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
        return url;
    }

    const payload = {
        usuarioId:    usuario.id,
        disciplina:   materia,
        tema,
        aula_url_1:   converterParaEmbed(aula_url_1),
        aula_url_2:   converterParaEmbed(aula_url_2),
        resumo,
        questoes_ids: questoesSelecionadas
    };

    try {
        const res = await fetch("http://localhost:3000/modulos/salvar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const texto = await res.text();

        if (!res.ok) {
            console.error("ERRO DO BACKEND:", texto);
            throw new Error(texto || "Erro ao salvar módulo");
        }

        alert("🚀 Módulo criado com sucesso!");

    } catch (err) {
        console.error("❌ Erro ao salvar módulo:", err.message);
        alert("Erro ao salvar módulo: " + err.message);
    }
}