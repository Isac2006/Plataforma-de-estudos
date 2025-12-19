// Variável interna do módulo (não polui o window)
let listaDeQuestoesLocal = [];

export async function aparecerquestoes() {
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
        listaDeQuestoesLocal = await resposta.json();

        divquetao.innerHTML = "";

        if (listaDeQuestoesLocal.length === 0) {
            divquetao.innerHTML = "<p>Nenhuma questão encontrada para este tema.</p>";
            return;
        }

        listaDeQuestoesLocal.forEach((questao, i) => {
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
                <button class="btn-responder" data-index="${i}">Responder</button>
                <button class="btn-ver" data-index="${i}">Ver Resposta</button>
                <p id="res-${i}" style="font-weight: bold; margin-top: 10px;"></p>
                <hr>
            `;
            divquetao.appendChild(questaoCard);
        });

        configurarEventosDosBotoes();
    } catch (erro) {
        console.error("Erro ao carregar questões:", erro);
        alert("Erro ao conectar com o servidor!");
    }
}

export async function cadastrarQuestao() {
    const disciplina = document.getElementById("ins-disciplina").value;
    const tema = document.getElementById("ins-tema").value;
    const enunciado = document.getElementById("ins-enunciado").value;
    const resposta_correta = document.getElementById("ins-correta").value;
    const alternativas = Array.from(document.querySelectorAll(".alt-input")).map(i => i.value);

    if (!disciplina || !tema || !enunciado || alternativas.includes("")) {
        alert("Por favor, preencha todos os campos!");
        return;
    }

    const dados = { 
        disciplina: disciplina.toLowerCase().trim(), 
        tema: tema.toLowerCase().trim(), 
        enunciado, 
        alternativas, 
        resposta_correta 
    };

    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("✅ Questão cadastrada com sucesso!");
            location.reload(); 
        }
    } catch (erro) {
        console.error("Erro ao cadastrar:", erro);
    }
}

function responder(indice) {
    const questao = listaDeQuestoesLocal[indice];
    const feedback = document.getElementById(`res-${indice}`);
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) return alert("Selecione uma opção!");

    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];
    const correto = String(textoSelecionado).trim() === String(questao.resposta_correta).trim();

    feedback.innerHTML = correto ? "✅ Resposta Correta!" : `❌ Errado! O correto é: ${questao.resposta_correta}`;
    feedback.style.color = correto ? "green" : "red";
}

function verResposta(indice) {
    const feedback = document.getElementById(`res-${indice}`);
    feedback.innerHTML = `Gabarito: ${listaDeQuestoesLocal[indice].resposta_correta}`;
    feedback.style.color = "blue";
}

function configurarEventosDosBotoes() {
    document.querySelectorAll('.btn-responder').forEach(btn => {
        btn.onclick = () => responder(btn.dataset.index);
    });
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.onclick = () => verResposta(btn.dataset.index);
    });
}