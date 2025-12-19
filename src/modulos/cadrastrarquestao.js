 export async function cadastrarQuestao() {
    // 1. Captura os valores dos inputs de texto simples
    const disciplina = document.getElementById("ins-disciplina").value;
    const tema = document.getElementById("ins-tema").value;
    const enunciado = document.getElementById("ins-enunciado").value;
    const resposta_correta = document.getElementById("ins-correta").value;

    // 2. Captura os valores das 4 alternativas e transforma em um Array []
    const inputsAlt = document.querySelectorAll(".alt-input");
    const alternativas = Array.from(inputsAlt).map(input => input.value);

    // 3. Monta o objeto exatamente como o servidor espera
    const dados = {
        disciplina: disciplina.toLowerCase().trim(),
        tema: tema.toLowerCase().trim(),
        enunciado: enunciado,
        alternativas: alternativas,
        resposta_correta: resposta_correta
    };

    // Validação básica para não enviar vazio
    if (!disciplina || !enunciado || alternativas.includes("")) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    // 4. Envia para o seu servidor Node.js
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