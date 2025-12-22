export async function cadastrarAula() {
    const disciplina = document.getElementById("cad-disciplina").value;
    const tema = document.getElementById("cad-tema").value;
    const linkRaw = document.getElementById("cad-link").value;

    if (!disciplina || !tema || !linkRaw) return alert("Preencha todos os campos!");

    // --- Lógica de extração de ID do YouTube mais robusta ---
    let videoId = "";
    try {
        if (linkRaw.includes("v=")) {
            videoId = linkRaw.split("v=")[1].split("&")[0];
        } else if (linkRaw.includes("youtu.be/")) {
            videoId = linkRaw.split("youtu.be/")[1].split("?")[0];
        } else if (linkRaw.includes("embed/")) {
            videoId = linkRaw.split("embed/")[1].split("?")[0];
        } else {
            // Caso colarem apenas o ID ou o código do iframe
            videoId = linkRaw.match(/([a-zA-Z0-9_-]{11})/)[0];
        }
    } catch (err) {
        return alert("Link do YouTube inválido!");
    }

    const urlEmbed = `https://www.youtube.com/embed/${videoId}`;
    const dados = { disciplina, tema, url: urlEmbed };

    try {
        const res = await fetch('http://localhost:3000/aulas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            alert("✅ Aula Cadastrada com sucesso!");
            // Limpa os campos após salvar
            document.getElementById("cad-tema").value = "";
            document.getElementById("cad-link").value = "";
        }
    } catch (e) { alert("Erro ao conectar ao servidor."); }
}

export async function carregarAula() {
    const disciplina = document.getElementById("select-disciplina").value;
    // AJUSTE AQUI: O ID agora é select-tema-aula (o select dinâmico)
    const tema = document.getElementById("select-tema-aula").value;
    const iframe = document.getElementById("video-player");
    const status = document.getElementById("status-aula");

    if (!disciplina || !tema) return alert("Selecione a disciplina e o tema!");

    try {
        const res = await fetch(`http://localhost:3000/aulas/buscar?disciplina=${disciplina}&tema=${tema}`);
        if (res.ok) {
            const aula = await res.json();
            iframe.src = aula.url;
            if (status) status.innerText = `Reproduzindo: ${aula.tema}`;
        } else {
            alert("❌ Vídeo não encontrado no banco de dados.");
        }
    } catch (e) { alert("Erro ao buscar a aula."); }
}