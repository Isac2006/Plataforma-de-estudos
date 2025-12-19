console.log("Script carregado com sucesso!");

// 1. Variável global para armazenar as questões
window.listaDeQuestoes = [];

// --- NOVO: Lógica para carregar temas dinamicamente ---

const selectDiciplina = document.getElementById("diciplinapedido");
const selectTema = document.getElementById("temapedido");

// Escuta quando o usuário muda a disciplina
selectDiciplina.addEventListener("change", async () => {
    const disciplina = selectDiciplina.value;

    if (!disciplina) {
        selectTema.innerHTML = '<option value="">Selecione uma matéria primeiro</option>';
        selectTema.disabled = true;
        return;
    }

    try {
        // Busca os temas no servidor baseados na disciplina
        // A rota no seu servidor deve ser preparada para receber ?disciplina=...
        const resposta = await fetch(`http://localhost:3000/temas?disciplina=${disciplina}`);
        const temas = await resposta.json();

        // Limpa e habilita o select de temas
        selectTema.innerHTML = '<option value="">Selecione o tema</option>';
        selectTema.disabled = false;

        // Preenche os temas retornados pelo servidor
        temas.forEach(tema => {
            const option = document.createElement("option");
            option.value = tema.toLowerCase(); // Valor para o banco
            option.textContent = tema;         // Texto para o usuário
            selectTema.appendChild(option);
        });

    } catch (erro) {
        console.error("Erro ao carregar temas:", erro);
        selectTema.innerHTML = '<option value="">Erro ao carregar temas</option>';
    }
});

// --- FIM DA LÓGICA DE TEMAS ---

// Ouvinte de clique no botão principal de busca
document.getElementById("gerar-questao").addEventListener("click", aparecerquestoes);

async function aparecerquestoes() {
    const diciplinapedido = document.getElementById("diciplinapedido").value;
    const temapedido = document.getElementById("temapedido").value;
    const divquetao = document.getElementById("questao-container");

    if (!diciplinapedido || !temapedido) {
        alert("Por favor, selecione a disciplina e o tema!");
        return;
    }

    try {
        const url = `http://localhost:3000/questoes?disciplina=${diciplinapedido}&tema=${temapedido}`;
        const resposta = await fetch(url);
        
        window.listaDeQuestoes = await resposta.json();

        divquetao.innerHTML = "";

        if (window.listaDeQuestoes.length === 0) {
            divquetao.innerHTML = "<p>Nenhuma questão encontrada para este tema.</p>";
            return;
        }

        window.listaDeQuestoes.forEach((questao, i) => {
            const questaoCard = document.createElement("div");
            questaoCard.classList.add("card-questao");

            questaoCard.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <p class="enunciado">${questao.enunciado}</p>
                <div class="alternativas">
                    ${questao.alternativas.map((alt, index) => `
                        <label class="alternativa-item">
                            <input type="radio" name="questao-${i}" value="${index}">
                            <span>${String.fromCharCode(65 + index)}) ${alt}</span>
                        </label>
                    `).join('')}
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

function verResposta(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    feedback.innerHTML = `Gabarito: ${questao.resposta_correta}`;
    feedback.style.color = "blue";
}

function responder(indice) {
    const questao = window.listaDeQuestoes[indice];
    const feedback = document.getElementById(`res-${indice}`);
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) {
        alert("Selecione uma opção antes de responder!");
        return;
    }

    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];

    if (String(textoSelecionado).trim() === String(questao.resposta_correta).trim()) {
        feedback.innerHTML = "✅ Resposta Correta!";
        feedback.style.color = "green";
    } else {
        feedback.innerHTML = `❌ Errado! O correto é: ${questao.resposta_correta}.`;
        feedback.style.color = "red";
    }
}

async function cadastrarQuestao() {
    const disciplina = document.getElementById("ins-disciplina").value;
    const tema = document.getElementById("ins-tema").value;
    const enunciado = document.getElementById("ins-enunciado").value;
    const resposta_correta = document.getElementById("ins-correta").value;

    const inputsAlt = document.querySelectorAll(".alt-input");
    const alternativas = Array.from(inputsAlt).map(input => input.value);

    const dados = {
        disciplina: disciplina.toLowerCase().trim(),
        tema: tema.toLowerCase().trim(),
        enunciado: enunciado,
        alternativas: alternativas,
        resposta_correta: resposta_correta
    };

    if (!disciplina || !tema || !enunciado || alternativas.includes("")) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const result = await response.json();
        
        if (response.ok) {
            alert("✅ Sucesso: " + result.mensagem);
            document.querySelectorAll('#formulario-cadastro input, #formulario-cadastro textarea').forEach(i => i.value = "");
        } else {
            alert("❌ Erro: " + result.mensagem);
        }
    } catch (erro) {
        console.error("Erro na conexão:", erro);
        alert("Não foi possível conectar ao servidor.");
    }
}