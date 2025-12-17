console.log("Script carregado com sucesso!");

// 1. Em vez de onclick no HTML, usamos o ouvinte de clique aqui
document.querySelector("button").addEventListener("click", aparecerquestoes);

async function aparecerquestoes() {
    // 2. Pegamos os valores dentro da função (para pegar o que o usuário escolheu no momento do clique)
    const diciplinapedido = document.getElementById("diciplinapedido").value;
    const temapedido = document.getElementById("temapedido").value;
    const divquetao = document.getElementById("questao-container");

    try {
        // 3. FAZEMOS O PEDIDO PARA O SERVIDOR
        // O servidor vai rodar a função 'pegarquestoesdobanco' por você
        const url = `http://localhost:3000/questoes?disciplina=${diciplinapedido}&tema=${temapedido}`;
        const resposta = await fetch(url);
        const questoes = await resposta.json();

        // 4. LIMPAR A DIV ANTES DE MOSTRAR NOVAS QUESTÕES
        divquetao.innerHTML = "";

        if (questoes.length === 0) {
            divquetao.innerHTML = "<p>Nenhuma questão encontrada para este tema.</p>";
            return;
        }

        // 5. LOOP PARA CRIAR OS CARDS
        questoes.forEach((questao, i) => {
            const questaoCard = document.createElement("div");
            questaoCard.classList.add("card-questao");

            questaoCard.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <p class="enunciado">${questao.enunciado}</p>
                <ul class="alternativas">
                    <li>A) ${questao.alternativas[0]}</li>
                    <li>B) ${questao.alternativas[1]}</li>
                    <li>C) ${questao.alternativas[2]}</li>
                    <li>D) ${questao.alternativas[3]}</li>
                </ul>
                <hr>
            `;
            divquetao.appendChild(questaoCard);
        });

    } catch (erro) {
        console.error("Erro ao carregar questões:", erro);
        alert("Erro ao conectar com o servidor. Certifique-se que o Node está rodando!");
    }
}