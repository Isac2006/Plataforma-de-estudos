let listaDeQuestoesLocal = [];
import { registrarRespostaQuestao } from './estatisticas.js';
// 1. FUNÇÃO PARA BUSCAR E EXIBIR AS QUESTÕES
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
            questaoCard.style = "border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; border-radius: 8px; background: #f9f9f9;";
            
            questaoCard.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <p class="enunciado" style="font-size: 1.1em; margin-bottom: 15px;">${questao.enunciado}</p>
                <div class="alternativas" style="margin-bottom: 15px;">
                    ${questao.alternativas.map((alt, index) => `
                        <label class="alternativa-item" style="display: block; margin-bottom: 8px; cursor: pointer;">
                            <input type="radio" name="questao-${i}" value="${index}">
                            <span>${String.fromCharCode(65 + index)}) ${alt}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="botoes-acao" style="display: flex; gap: 10px;">
                    <button class="btn-responder" data-index="${i}">Responder</button>
                    <button class="btn-ver" data-index="${i}">Ver Resposta</button>
                    <button class="btn-editar" data-index="${i}">Editar</button>
                    <button class="btn-apagar" data-id="${questao.id}" style="background-color: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Apagar</button>
                </div>
                <p id="res-${i}" style="font-weight: bold; margin-top: 15px; min-height: 20px;"></p>
                <hr style="margin-top: 20px; border: 0; border-top: 1px solid #eee;">
            `;
            divquetao.appendChild(questaoCard);
        });

        configurarEventosDosBotoes();

    } catch (erro) {
        console.error("Erro ao carregar questões:", erro);
        alert("Erro ao conectar com o servidor!");
    }
}

// 2. FUNÇÃO PARA INICIAR A EDIÇÃO
export function iniciarEdicao(indice) {
    const questao = listaDeQuestoesLocal[indice];
    const divquetao = document.querySelectorAll(".card-questao")[indice];

    divquetao.innerHTML = `
        <h3>Editando Questão ${indice + 1}</h3>
        <textarea id="edit-enunciado-${indice}" style="width: 100%; height: 60px; margin-bottom: 10px;">${questao.enunciado}</textarea>
        <div class="alternativas-edit">
            ${questao.alternativas.map((alt, altIdx) => `
                <div style="display: flex; align-items: center; margin-bottom: 5px;">
                    <span style="margin-right: 5px;">${String.fromCharCode(65 + altIdx)})</span>
                    <input type="text" class="edit-alt-${indice}" value="${alt}" style="width: 100%;">
                </div>
            `).join('')} 
        </div>
        <p style="margin-top: 10px;"><strong>Gabarito:</strong></p>
        <input type="text" id="edit-correta-${indice}" value="${questao.resposta_correta}" style="width: 100%; margin-bottom: 15px;">
        <div style="margin-top: 10px; display: flex; gap: 10px;">
            <button class="btn-salvar-edit" data-index="${indice}" data-id="${questao.id}" style="background-color: green; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Salvar Alterações</button>
            <button class="btn-cancelar-edit" style="background-color: gray; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">Cancelar</button>
        </div>
    `;

    // Vincula os eventos dos novos botões gerados
    divquetao.querySelector('.btn-salvar-edit').onclick = (e) => {
        const btn = e.target;
        salvarEdicao(btn.dataset.index, btn.dataset.id);
    };
    divquetao.querySelector('.btn-cancelar-edit').onclick = () => aparecerquestoes();
}

// 3. FUNÇÃO PARA SALVAR A EDIÇÃO NO SERVIDOR
export async function salvarEdicao(indice, id) {
    const enunciado = document.getElementById(`edit-enunciado-${indice}`).value;
    const alternativas = Array.from(document.querySelectorAll(`.edit-alt-${indice}`)).map(i => i.value);
    const resposta_correta = document.getElementById(`edit-correta-${indice}`).value;

    const dadosAtualizados = { enunciado, alternativas, resposta_correta };

    try {
        const response = await fetch(`http://localhost:3000/questoes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosAtualizados)
        });

        if (response.ok) {
            alert("✅ Questão atualizada com sucesso!");
            aparecerquestoes();
        } else {
            alert("❌ Erro ao atualizar questão.");
        }
    } catch (erro) {
        console.error("Erro na edição:", erro);
        alert("Erro ao salvar edição.");
    }
}

// 4. DEMAIS FUNÇÕES (RESPONDER, VER RESPOSTA, APAGAR)

export function responder(indice) { // Removido nomeUsuario dos parâmetros
    const questao = listaDeQuestoesLocal[indice];
    const feedback = document.getElementById(`res-${indice}`);
    const marcado = document.querySelector(`input[name="questao-${indice}"]:checked`);

    if (!marcado) {
        alert("Selecione uma opção!");
        return;
    }

    // --- BUSCA O ID AO INVÉS DO NOME ---
    const idUsuario = localStorage.getItem("usuarioId");

    if (!idUsuario || idUsuario === "undefined") {
        console.error("ID do usuário não encontrado no localStorage");
        alert("Erro: Usuário não identificado. Tente fazer login novamente.");
        return;
    }

    const textoSelecionado = questao.alternativas[parseInt(marcado.value)];
    const correto = String(textoSelecionado).trim() === String(questao.resposta_correta).trim();

    const disciplina = questao.disciplina || document.getElementById("diciplinapedido").value;
    
    // Agora enviamos o ID, que é o que o servidor espera na rota /registrar-resposta
    registrarRespostaQuestao(idUsuario, disciplina, correto); 

    feedback.innerHTML = correto ? "✅ Resposta Correta!" : `❌ Errado! Gabarito: ${questao.resposta_correta}`;
    feedback.style.color = correto ? "green" : "red";

    const btnResponder = document.querySelector(`.btn-responder[data-index="${indice}"]`);
    if(btnResponder) btnResponder.disabled = true;
}
export function verResposta(indice) {
    const feedback = document.getElementById(`res-${indice}`);
    feedback.innerHTML = `Gabarito: ${listaDeQuestoesLocal[indice].resposta_correta}`;
    feedback.style.color = "blue";
}

export async function apagarQuestao(id) {
    if (!confirm("Tem certeza que deseja excluir permanentemente esta questão?")) return;

    try {
        const response = await fetch(`http://localhost:3000/questoes/${id}`, { method: 'DELETE' });
        if (response.ok) {
            alert("Questão apagada!");
            aparecerquestoes();
        }
    } catch (erro) {
        console.error("Erro ao apagar:", erro);
    }
}

// 5. CONFIGURAÇÃO DE EVENTOS (Versão Única e Corrigida)
function configurarEventosDosBotoes() {
    // --- MUDANÇA AQUI: Pegamos o ID em vez do nome ---
    const idUsuario = localStorage.getItem("usuarioId");

    // Configura o botão RESPONDER (passando o ID do usuário)
    document.querySelectorAll('.btn-responder').forEach(btn => {
        btn.onclick = () => responder(btn.dataset.index, idUsuario);
    });

    // ... (restante dos botões Ver, Editar e Apagar permanecem iguais)
    document.querySelectorAll('.btn-ver').forEach(btn => {
        btn.onclick = () => verResposta(btn.dataset.index);
    });
    document.querySelectorAll('.btn-editar').forEach(btn => {
        btn.onclick = () => iniciarEdicao(btn.dataset.index);
    });
    document.querySelectorAll('.btn-apagar').forEach(btn => {
        btn.onclick = () => apagarQuestao(btn.dataset.id);
    });
}