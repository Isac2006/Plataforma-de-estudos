// src/aulas.js
console.log("🎥 aulas.js carregado");

import { obterUsuarioLogado } from './auth.js';
import { registrarProgresso } from './modulos/estatisticas.js';

document.addEventListener("DOMContentLoaded", () => {
    const selectDisciplina = document.getElementById("select-disciplina");
    const selectTema = document.getElementById("select-tema-aula");
    const status = document.getElementById("status-aula");

    const video1 = document.getElementById("video-player");
    const video2 = document.getElementById("video-player-2");
    const containerVideo2 = document.getElementById("container-video-2");

    if (!selectDisciplina || !selectTema || !video1) return;

    // 🔑 Obtém o usuarioId uma vez, reutiliza em todas as requisições
    const usuario = obterUsuarioLogado();
    const usuarioId = usuario?.id;

    /* ===============================
       AO MUDAR DISCIPLINA → BUSCA TEMAS
    ================================ */
    selectDisciplina.addEventListener("change", async () => {
        const disciplina = selectDisciplina.value;

        selectTema.innerHTML = `<option value="">Selecione o tema</option>`;
        selectTema.disabled = true;
        status.textContent = "";

        if (!disciplina) return;

        try {
            const res = await fetch(
                `/temas?disciplina=${encodeURIComponent(disciplina)}&usuarioId=${usuarioId}`
            );

            // ✅ Trata 401/403 antes de tentar usar o JSON
            if (!res.ok) {
                status.textContent = res.status === 401 || res.status === 403
                    ? "Acesso restrito. Faça login para continuar."
                    : "Erro ao carregar temas.";
                return;
            }

            const temas = await res.json();

            // ✅ Garante que é um array antes de iterar
            if (!Array.isArray(temas)) {
                console.error("Resposta inesperada ao buscar temas:", temas);
                status.textContent = "Erro ao carregar temas.";
                return;
            }

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema;
                option.textContent = tema;
                selectTema.appendChild(option);
            });

            selectTema.disabled = false;
        } catch (e) {
            console.error(e);
            status.textContent = "Erro ao carregar temas";
        }
    });

    /* ===============================
       AO MUDAR TEMA → CARREGA VÍDEOS
    ================================ */
    selectTema.addEventListener("change", async () => {
        const disciplina = selectDisciplina.value;
        const tema = selectTema.value;

        if (!disciplina || !tema) return;

        status.textContent = "Carregando aula...";
        containerVideo2.classList.add("hidden");

        try {
            const res = await fetch(
                `/aulas/buscar?disciplina=${encodeURIComponent(disciplina)}&tema=${encodeURIComponent(tema)}&usuarioId=${usuarioId}`
            );

            if (!res.ok) {
                status.textContent = res.status === 401 || res.status === 403
                    ? "Acesso restrito. Faça login para continuar."
                    : "Aula não encontrada.";
                video1.src = "";
                video2.src = "";
                return;
            }

            const aula = await res.json();
            console.log("AULA RECEBIDA:", aula);

            video1.src = converterParaEmbed(aula.aula_url);

            if (aula.aula_url_2 && aula.aula_url_2.trim() !== "") {
                video2.src = converterParaEmbed(aula.aula_url_2);
                containerVideo2.classList.remove("hidden");
            } else {
                video2.src = "";
                containerVideo2.classList.add("hidden");
            }

            status.textContent = "Aula carregada com sucesso ✅";

            // 🔥 REGISTRA QUE O ALUNO ASSISTIU A AULA
            try {
                if (usuario?.nome) {
                    await registrarProgresso(usuario.nome, "aulasAssistidas");
                    console.log("📊 Aula registrada nas estatísticas");
                }
            } catch (e) {
                console.error("Erro ao registrar aula nas estatísticas:", e);
            }

        } catch (e) {
            console.error(e);
            status.textContent = "Erro ao carregar vídeo";
        }
    });
});

/* ===============================
   FUNÇÃO AUXILIAR
=============================== */
function converterParaEmbed(url) {
    if (!url) return "";
    if (url.includes("watch?v=")) return url.replace("watch?v=", "embed/");
    if (url.includes("youtu.be/")) return url.replace("youtu.be/", "www.youtube.com/embed/");
    return url;
}