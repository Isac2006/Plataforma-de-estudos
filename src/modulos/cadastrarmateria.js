export async function cadastrarMateria() {
    const disciplinaEl = document.getElementById("materia-disciplina");
    const temaEl = document.getElementById("materia-tema");
    const resumoEl = document.getElementById("materia-resumo");
    const conteudoEl = document.getElementById("materia-conteudo");
    const mensagemTopo = document.getElementById("mensagem-topo");

    // 🛑 SEGURANÇA
    if (!mensagemTopo) {
        console.error("Div mensagem-topo não encontrada no HTML");
        return;
    }

    // ===== VALIDAÇÃO =====
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

    const dados = {
        disciplina: disciplinaEl.value,
        tema: temaEl.value,
        resumo: resumoEl.value,
        conteudoCompleto: conteudoEl.value
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

            setTimeout(() => {
                mensagemTopo.style.display = "none";
            }, 4000);
        }
    } catch (erro) {
        mensagemTopo.textContent = "❌ Erro ao conectar com o servidor.";
        mensagemTopo.style.display = "block";
    }
}
