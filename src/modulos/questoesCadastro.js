export function cadastrarQuestao() {
    const disciplinaEl  = document.getElementById("questao-disciplina");
    const temaEl        = document.getElementById("questao-tema");
    const enunciadoEl   = document.getElementById("questao-enunciado");
    const corretaEl     = document.getElementById("questao-correta");
    const explicacaoEl  = document.getElementById("questao-explicacao");
    const mensagem      = document.getElementById("mensagem-questoes");

    if (!disciplinaEl || !temaEl || !enunciadoEl || !corretaEl || !mensagem) {
        console.error("❌ Elementos da questão não encontrados no HTML");
        return;
    }

    const alternativas = [
        document.getElementById("alternativa-a").value.trim(),
        document.getElementById("alternativa-b").value.trim(),
        document.getElementById("alternativa-c").value.trim(),
        document.getElementById("alternativa-d").value.trim()
    ];

    if (
        !disciplinaEl.value ||
        !temaEl.value.trim() ||
        !enunciadoEl.value.trim() ||
        !corretaEl.value
    ) {
        exibirMensagem("⚠️ Preencha todos os campos obrigatórios.", "erro");
        return;
    }

    if (alternativas.some(a => a === "")) {
        exibirMensagem("⚠️ Preencha todas as alternativas.", "erro");
        return;
    }

    // ✅ Converte a letra selecionada para o texto da alternativa
    const mapaLetra = { A: 0, B: 1, C: 2, D: 3 };
    const indiceCorreto = mapaLetra[corretaEl.value];

    if (indiceCorreto === undefined) {
        exibirMensagem("⚠️ Selecione a alternativa correta.", "erro");
        return;
    }

    const resposta_correta = alternativas[indiceCorreto]; // ✅ texto completo

    if (!resposta_correta) {
        exibirMensagem("⚠️ A alternativa correta está vazia.", "erro");
        return;
    }

    const questao = {
        disciplina:      disciplinaEl.value,
        tema:            temaEl.value.trim(),
        enunciado:       enunciadoEl.value.trim(),
        alternativas,
        resposta_correta,                    // ✅ texto da alternativa, não a letra
        explicacao:      explicacaoEl?.value.trim() || ""
    };

    salvarQuestaoLocal(questao);
    enviarQuestaoServidor(questao);
    exibirMensagem("✅ Questão cadastrada com sucesso!", "sucesso");
    limparFormularioQuestao();
}

/* =========================
   ENVIO PARA O SERVIDOR
========================= */

async function enviarQuestaoServidor(questao) {
    try {

        const usuario = JSON.parse(localStorage.getItem("usuarioLogado"));

        if (!usuario) {
            exibirMensagem("⚠️ Usuário não autenticado.", "erro");
            return;
        }

        const resposta = await fetch("/questoes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                ...questao,
                usuarioId: usuario.id // 🔥 AQUI É O CERTO
            })
        });

        if (!resposta.ok) {
            const erroServidor = await resposta.json();
            throw new Error(erroServidor.erro || "Erro ao salvar no servidor");
        }

        console.log("📁 Questão salva no bancoquestoes.json");

    } catch (erro) {
        console.error("❌ Erro ao enviar questão:", erro);
        exibirMensagem(
            "⚠️ A questão foi salva localmente, mas falhou no servidor.",
            "erro"
        );
    }
}

/* =========================
   FUNÇÕES AUXILIARES
========================= */

function salvarQuestaoLocal(questao) {
    const questoes = JSON.parse(localStorage.getItem("questoes")) || [];
    questoes.push(questao);
    localStorage.setItem("questoes", JSON.stringify(questoes));
}

function limparFormularioQuestao() {
    document.getElementById("questao-disciplina").value = "";
    document.getElementById("questao-tema").value = "";
    document.getElementById("questao-enunciado").value = "";
    document.getElementById("questao-correta").value = "";
    document.getElementById("questao-explicacao").value = "";

    ["a", "b", "c", "d"].forEach(letra => {
        document.getElementById(`alternativa-${letra}`).value = "";
    });
}

function exibirMensagem(texto, tipo) {
    const msg = document.getElementById("mensagem-questoes");
    if (!msg) return;

    msg.textContent = texto;
    msg.style.display = "block";

    if (tipo === "sucesso") {
        msg.style.background = "#e5ffe5";
        msg.style.color = "#006400";
    } else {
        msg.style.background = "#ffe5e5";
        msg.style.color = "#a10000";
    }

    setTimeout(() => {
        msg.style.display = "none";
    }, 4000);
}
