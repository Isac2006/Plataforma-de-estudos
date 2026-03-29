import { obterUsuarioLogado } from "../auth.js";

/* ===============================
   ESTADO LOCAL
================================ */
let questoesDisponiveis = [];
let questoesAtuaisDoModulo = [];

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
    const select = document.getElementById("selectQuestoes");
    if (!select) return;

    select.innerHTML = "";

    if (!questoes.length) {
        select.innerHTML = `<option>Nenhuma questão encontrada</option>`;
        return;
    }

    questoes.forEach(q => {
        const opt = document.createElement("option");
        opt.value = q.id;
        opt.textContent = `Q${q.id} — ${q.enunciado.substring(0, 60)}...`;
        select.appendChild(opt);
    });
}

/* ===============================
   SALVAR MÓDULO
================================ */
export async function finalizarModulo() {

    const usuario = obterUsuarioLogado(); // 🔥 FALTAVA ISSO

    if (!usuario || usuario.tipo !== "professor") {
        alert("Apenas professores podem criar módulos.");
        return;
    }

    const materia = document.getElementById("selectMateria")?.value;
    const tema = document.getElementById("selectTema")?.value;
    const selectQuestoes = document.getElementById("selectQuestoes");

    if (!selectQuestoes) {
        alert("Erro interno: select de questões não encontrado.");
        return;
    }

    const questoesSelecionadas = Array.from(selectQuestoes.selectedOptions)
        .map(opt => opt.value);

    if (!materia || !tema || questoesSelecionadas.length === 0) {
        alert("Preencha matéria, tema e selecione ao menos uma questão.");
        return;
    }

    const aula_url_1 = document.getElementById("aula1")?.value.trim() || "";
    const aula_url_2 = document.getElementById("aula2")?.value.trim() || "";
    const resumo = document.getElementById("resumo")?.value.trim() || "";

    function converterParaEmbed(url) {
    if (!url) return "";
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
}

    const payload = {
    usuarioId: usuario.id, 
    disciplina: materia,
    tema,
    aula_url_1: converterParaEmbed(aula_url_1),
    aula_url_2: converterParaEmbed(aula_url_2),
    resumo,
    questoes_ids: questoesSelecionadas
};


    try {
        const res = await fetch("http://localhost:3000/modulos/salvar", {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
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