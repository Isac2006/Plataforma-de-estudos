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
function verResposta(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    
    // Como seu JSON já tem o valor (ex: 4), mostramos ele direto
    feedback.innerHTML = `Gabarito: ${questao.resposta_correta}`;
    feedback.style.color = "blue";
}

// 5. Função para Corrigir (Responder)
function responder(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    
    // Pegamos o rádio marcado
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) {
        alert("Selecione uma opção!");
        return;
    }

    // Pegamos o TEXTO da alternativa que o usuário clicou
    // marcado.value é o índice (0, 1, 2...). Usamos isso para pegar o texto no array.
    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];

    // Comparamos o texto selecionado com a resposta_correta do JSON
    // Usamos String() para garantir que números virem texto na comparação
    if (String(textoSelecionado) === String(questao.resposta_correta)) {
        feedback.innerHTML = "✅ Resposta Correta!";
        feedback.style.color = "green";
    } else {
        feedback.innerHTML = `❌ Errado! Você marcou ${textoSelecionado}, mas o correto é ${questao.resposta_correta}.`;
        feedback.style.color = "red";
    }
}