export async function cadastrarQuestao() {
    // 1. Captura os valores dos inputs
    const disciplina = document.getElementById("ins-disciplina").value;
    const tema = document.getElementById("ins-tema").value;
    const enunciado = document.getElementById("ins-enunciado").value;
    const resposta_correta = document.getElementById("ins-correta").value;

    // 2. Captura as 4 alternativas
    const inputsAlt = document.querySelectorAll(".alt-input");
    const alternativas = Array.from(inputsAlt).map(input => input.value.trim());

    // 3. Validação antes de enviar
    if (!disciplina || !tema || !enunciado || !resposta_correta || alternativas.includes("")) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    if (alternativas.length !== 4) {
        alert("A questão deve ter exatamente 4 alternativas!");
        return;
    }

    // 4. Pega o id do professor logado (salvo no localStorage no momento do login)
    const usuarioId = localStorage.getItem("usuarioId");

    if (!usuarioId) {
        alert("Você precisa estar logado como professor!");
        return;
    }

    // 5. Monta o objeto com usuarioId (exigido pelo middleware apenasProfessor)
    const dados = {
        usuarioId: Number(usuarioId),
        disciplina: disciplina.toLowerCase().trim(),
        tema: tema.toLowerCase().trim(),
        enunciado: enunciado.trim(),
        alternativas: alternativas,
        resposta_correta: resposta_correta.trim()
    };

    // 6. Envia para o servidor
    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();

        if (response.ok) {
            alert("✅ Sucesso: " + result.mensagem);
            // Limpa os campos após salvar
            document.querySelectorAll('input, textarea').forEach(i => i.value = "");
        } else {
            alert("❌ Erro: " + result.mensagem);
        }
    } catch (erro) {
        console.error("Erro na conexão:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}