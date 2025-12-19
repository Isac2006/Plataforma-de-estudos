console.log("Script carregado com sucesso!");

// 1. Criamos a variável global para armazenar as questões
window.listaDeQuestoes = [];

// Ouvinte de clique no botão principal de busca
document.querySelector("button").addEventListener("click", aparecerquestoes);

async function aparecerquestoes() {
    const diciplinapedido = document.getElementById("diciplinapedido").value;
    const temapedido = document.getElementById("temapedido").value;
    const divquetao = document.getElementById("questao-container");

    try {
        const url = `http://localhost:3000/questoes?disciplina=${diciplinapedido}&tema=${temapedido}`;
        const resposta = await fetch(url);
        
        // 2. Salvamos o resultado na variável global ANTES de usar
        window.listaDeQuestoes = await resposta.json();

        divquetao.innerHTML = "";

        if (window.listaDeQuestoes.length === 0) {
            divquetao.innerHTML = "<p>Nenhuma questão encontrada para este tema.</p>";
            return;
        }

        // 3. Loop para criar os cards
        window.listaDeQuestoes.forEach((questao, i) => {
            const questaoCard = document.createElement("div");
            questaoCard.classList.add("card-questao");

            // Importante: Note que o "name" do rádio agora tem o índice ${i}
            // e criamos um <p> com id="res-${i}" para mostrar a resposta
            questaoCard.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <p class="enunciado">${questao.enunciado}</p>
                <div class="alternativas">
                    <label class="alternativa-item">
                        <input type="radio" name="questao-${i}" value="0">
                        <span>A) ${questao.alternativas[0]}</span>
                    </label>
                    <label class="alternativa-item">
                        <input type="radio" name="questao-${i}" value="1">
                        <span>B) ${questao.alternativas[1]}</span>
                    </label>
                    <label class="alternativa-item">
                        <input type="radio" name="questao-${i}" value="2">
                        <span>C) ${questao.alternativas[2]}</span>
                    </label>
                    <label class="alternativa-item">
                        <input type="radio" name="questao-${i}" value="3">
                        <span>D) ${questao.alternativas[3]}</span>
                    </label>
                </div>
                <button onclick="responder(${i})">Responder</button>
                <button onclick="verResposta(${i})">Ver Resposta</button>
                <p id="res-${i}" style="font-weight: bold; margin-top: 10px;"></p>
                <hr>
            `;
            divquetao.appendChild(questaoCard);
        });

    } catch (erro) {
        console.error("Erro ao carregar questões:", erro);
        alert("Erro ao conectar com o servidor!");
    }
}

// 4. Função para Ver Resposta (Gabarito)
// Esta função apenas mostra o que está escrito no campo 'resposta_correta'
function verResposta(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    
    // Mostra o valor direto (ex: 4), sem tentar converter para letra A, B, C
    feedback.innerHTML = `Gabarito: ${questao.resposta_correta}`;
    feedback.style.color = "blue";
}

// 5. Função para Corrigir (Responder)
// Esta função compara o TEXTO da alternativa clicada com o valor do banco
function responder(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    
    // 1. Pega qual "bolinha" o usuário marcou
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) {
        alert("Selecione uma opção antes de responder!");
        return;
    }

    // 2. Transforma a posição (0, 1, 2...) no TEXTO da alternativa
    // Ex: Se clicou na quarta opção (valor 3), pega o texto "4" no array de alternativas
    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];

    // 3. Compara o texto da tela com a resposta do JSON
    // Usamos String() para garantir que números e textos sejam comparados corretamente
    if (String(textoSelecionado) === String(questao.resposta_correta)) {
        feedback.innerHTML = "✅ Resposta Correta!";
        feedback.style.color = "green";
    } else {
        feedback.innerHTML = `❌ Errado! Você marcou ${textoSelecionado}, mas o correto é ${questao.resposta_correta}.`;
        feedback.style.color = "red";
    }
}
  async function cadastrarQuestao() {
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