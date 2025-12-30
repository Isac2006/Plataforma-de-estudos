export async function cadastrarMateria() {
    const disciplinaEl = document.getElementById("materia-disciplina");
    const temaEl = document.getElementById("materia-tema");
    const resumoEl = document.getElementById("materia-resumo");
    const conteudoEl = document.getElementById("materia-conteudo");
    const mensagemTopo = document.getElementById("mensagem-topo");
    const imagensEls = document.querySelectorAll(".imagem-url");

    if (!mensagemTopo) {
        console.error("Div mensagem-topo não encontrada no HTML");
        return;
    }

    if (
        !disciplinaEl.value ||
        !temaEl.value ||
        !resumoEl.value ||
        !conteudoEl.value
    ) {
        mensagemTopo.textContent = "⚠️ Preencha todos os campos obrigatórios da matéria.";
        mensagemTopo.style.display = "block";
        mensagemTopo.style.background = "#ffe5e5";
        mensagemTopo.style.color = "#a10000";
        mensagemTopo.style.border = "1px solid #ffb3b3";

        setTimeout(() => {
            mensagemTopo.style.display = "none";
        }, 4000);

        return;
    }

        const imagens = [];
    imagensEls.forEach(input => {
        if (input.value.trim() !== "") {
            imagens.push(input.value.trim());
        }
    });

    // 🔹 PREVIEW DAS IMAGENS 🔹
    const preview = document.getElementById("preview-imagens");
    if (preview) {
        preview.innerHTML = "";

        imagens.forEach(url => {
            const img = document.createElement("img");
            img.src = url;
            img.alt = "Pré-visualização";
            img.classList.add("imagem-preview");
            preview.appendChild(img);
        });
    }

    const dados = {
        disciplina: disciplinaEl.value,
        tema: temaEl.value,
        resumo: resumoEl.value,
        conteudoCompleto: conteudoEl.value,
        imagens: imagens
    };


    try {
        const res = await fetch("http://localhost:3000/materias", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(dados)
        });

        if (res.ok) {
            mensagemTopo.textContent = "✅ Matéria cadastrada com sucesso!";
            mensagemTopo.style.background = "#e5ffe5";
            mensagemTopo.style.color = "#006400";
            mensagemTopo.style.border = "1px solid #9be59b";
            mensagemTopo.style.display = "block";

            disciplinaEl.value = "";
            temaEl.value = "";
            resumoEl.value = "";
            conteudoEl.value = "";

            document.querySelectorAll(".imagem-url").forEach((input, index) => {
                if (index > 0) input.remove();
                else input.value = "";
            });

            setTimeout(() => {
                mensagemTopo.style.display = "none";
            }, 4000);
        }
    } catch (erro) {
        mensagemTopo.textContent = "❌ Erro ao conectar com o servidor.";
        mensagemTopo.style.display = "block";
    }
}
