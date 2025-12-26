// --- FUNÇÃO AUXILIAR PARA EXTRAIR ID (Para não repetir código) ---
function extrairVideoID(linkRaw) {
    if (!linkRaw) return "";
    try {
        if (linkRaw.includes("v=")) {
            return linkRaw.split("v=")[1].split("&")[0];
        } else if (linkRaw.includes("youtu.be/")) {
            return linkRaw.split("youtu.be/")[1].split("?")[0];
        } else if (linkRaw.includes("embed/")) {
            return linkRaw.split("embed/")[1].split("?")[0];
        } else {
            const match = linkRaw.match(/([a-zA-Z0-9_-]{11})/);
            return match ? match[0] : "";
        }
    } catch (err) {
        return "";
    }
}

export async function cadastrarAula() {
    const disciplina = document.getElementById("cad-disciplina").value;
    const tema = document.getElementById("cad-tema").value;
    const linkRaw1 = document.getElementById("cad-link").value;
    const linkRaw2 = document.getElementById("cad-link-2")?.value || ""; // Segundo link opcional

    if (!disciplina || !tema || !linkRaw1) return alert("Preencha ao menos a disciplina, tema e o primeiro link!");

    // Extração dos IDs
    const id1 = extrairVideoID(linkRaw1);
    const id2 = extrairVideoID(linkRaw2);

    if (!id1) return alert("O primeiro link do YouTube é inválido!");

    const dados = { 
        disciplina, 
        tema, 
        url: `https://www.youtube.com/embed/${id1}`,
        url2: id2 ? `https://www.youtube.com/embed/${id2}` : "" // Salva se existir
    };

    try {
        const res = await fetch('http://localhost:3000/aulas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });
        if (res.ok) {
            alert("✅ Aula(s) Cadastrada(s) com sucesso!");
            document.getElementById("cad-tema").value = "";
            document.getElementById("cad-link").value = "";
            if(document.getElementById("cad-link-2")) document.getElementById("cad-link-2").value = "";
        }
    } catch (e) { alert("Erro ao conectar ao servidor."); }
}

export async function carregarAula() {
    const disciplina = document.getElementById("select-disciplina").value;
    const tema = document.getElementById("select-tema-aula").value;
    
    // Elementos dos Players
    const iframe1 = document.getElementById("video-player");
    const iframe2 = document.getElementById("video-player-2"); // Novo iframe no HTML
    const containerVideo2 = document.getElementById("container-video-2"); // Div que envolve o segundo video
    const status = document.getElementById("status-aula");

    if (!disciplina || !tema) return alert("Selecione a disciplina e o tema!");

    try {
        const res = await fetch(`http://localhost:3000/aulas/buscar?disciplina=${disciplina}&tema=${tema}`);
        if (res.ok) {
            const aula = await res.json();
            
            // Vídeo 1 (Sempre aparece)
            iframe1.src = aula.url;
            
            // Vídeo 2 (Aparece apenas se existir no banco)
            if (aula.url2 && iframe2) {
                iframe2.src = aula.url2;
                if (containerVideo2) containerVideo2.style.display = "block";
            } else {
                if (iframe2) iframe2.src = "";
                if (containerVideo2) containerVideo2.style.display = "none";
            }

            if (status) status.innerText = `Reproduzindo: ${aula.tema}`;
        } else {
            alert("❌ Vídeo não encontrado no banco de dados.");
        }
    } catch (e) { alert("Erro ao buscar a aula."); }
}