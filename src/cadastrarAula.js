// src/aulas/cadastrarAula.js
console.log("📚 cadastrarAula.js carregado");

document.addEventListener("DOMContentLoaded", () => {
    const btnSalvar = document.getElementById("btn-salvar-aula");

    if (!btnSalvar) return;

    btnSalvar.addEventListener("click", cadastrarAula);
});

async function cadastrarAula() {
    const disciplina = document.getElementById("disciplina-aula")?.value;
    const tema = document.getElementById("tema-aula")?.value;
    const urlInput = document.getElementById("url-aula")?.value;
    const url2Input = document.getElementById("url-aula-2")?.value;

    if (!disciplina || !tema || !urlInput) {
        alert("Preencha disciplina, tema e o vídeo principal");
        return;
    }

    // ✅ Validação do vídeo principal
    if (!validarYoutube(urlInput)) {
        alert("❌ O vídeo principal não é um link válido do YouTube");
        return;
    }

    // 🔁 Conversão automática
    const url = converterParaEmbed(urlInput);

    // Vídeo 2 (opcional)
    let url2 = "";
    if (url2Input) {
        if (!validarYoutube(url2Input)) {
            alert("❌ O segundo vídeo não é um link válido do YouTube");
            return;
        }
        url2 = converterParaEmbed(url2Input);
    }

    // 🔹 Verifica usuário logado
    const usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado'));
    if (!usuarioLogado) {
        alert("Usuário não está logado!");
        return;
    }

    try {
        const res = await fetch("/aulas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                usuarioId: usuarioLogado.id, // agora definido
                disciplina,
                tema,
                url,
                url2
            })
        });

        const data = await res.json();

        if (!res.ok) {
            alert(data.erro || data.mensagem || "Erro ao salvar aula");
            return;
        }

        alert("✅ Aula cadastrada com sucesso!");

        // Limpa formulário
        document.getElementById("tema-aula").value = "";
        document.getElementById("url-aula").value = "";
        document.getElementById("url-aula-2").value = "";

    } catch (e) {
        console.error(e);
        alert("Erro ao conectar com o servidor");
    }
}



/* ===============================
   YOUTUBE – VALIDAR + CONVERTER
=============================== */

function extrairIdYoutube(url) {
    if (!url) return null;
    const regex = /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regex);
    return match ? match[1] : null;
}

function converterParaEmbed(url) {
    const videoId = extrairIdYoutube(url);
    if (!videoId) return null;

    // Pegando timestamp se existir
    const matchTime = url.match(/[?&]t=(\d+)s/);
    const start = matchTime ? `?start=${matchTime[1]}` : '';
    return `https://www.youtube.com/embed/${videoId}${start}`;
}

// Valida se é YouTube
function validarYoutube(url) {
    return extrairIdYoutube(url) !== null;
}
