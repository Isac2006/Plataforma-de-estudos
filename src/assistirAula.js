// src/aulas.js
console.log("🎥 aulas.js carregado");

document.addEventListener("DOMContentLoaded", () => {
    const selectDisciplina = document.getElementById("select-disciplina");
    const selectTema = document.getElementById("select-tema-aula");
    const status = document.getElementById("status-aula");

    const video1 = document.getElementById("video-player");
    const video2 = document.getElementById("video-player-2");
    const containerVideo2 = document.getElementById("container-video-2");

    if (!selectDisciplina || !selectTema || !video1) return;

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
            const res = await fetch(`/temas?disciplina=${disciplina}`);
            const temas = await res.json();

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema;
                option.textContent = tema;
                selectTema.appendChild(option);
            });

            selectTema.disabled = false;
        } catch (e) {
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
                `/aulas/buscar?disciplina=${disciplina}&tema=${tema}`
            );

            if (!res.ok) {
                status.textContent = "Aula não encontrada";
                return;
            }

            const aula = await res.json();

            // 🎥 Vídeo principal
            video1.src = converterParaEmbed(aula.url);

            // 🎥 Segundo vídeo (opcional)
if (aula.url2 && aula.url2.trim() !== "") {
    video2.src = converterParaEmbed(aula.url2);
    containerVideo2.classList.remove("hidden");
} else {
    video2.src = "";
    containerVideo2.classList.add("hidden");
}


            status.textContent = "Aula carregada com sucesso ✅";
        } catch (e) {
            status.textContent = "Erro ao carregar vídeo";
        }
    });
});

/* ===============================
   FUNÇÃO AUXILIAR
=============================== */
function converterParaEmbed(url) {
    if (!url) return "";

    if (url.includes("watch?v=")) {
        return url.replace("watch?v=", "embed/");
    }

    if (url.includes("youtu.be/")) {
        return url.replace("youtu.be/", "www.youtube.com/embed/");
    }

    return url;
}
