// --- modulos/construtor.js ---

// VARIÁVEL LOCAL PARA ARMAZENAR AS QUESTÕES DO MÓDULO CARREGADO (ALUNO)
let questoesAtuaisDoModulo = [];

/**
 * BUSCA DADOS PARA O CONSTRUTOR (PROFESSOR)
 * Busca aula, resumo e questões para montar o módulo
 */
export async function buscarDadosParaModulo() {
    const disciplina = document.getElementById("construtor-disciplina").value;
    const tema = document.getElementById("construtor-tema").value;

    if (!disciplina || !tema) return;

    try {
        const resposta = await fetch(`http://localhost:3000/construtor/dados?disciplina=${disciplina}&tema=${tema}`);
        if (!resposta.ok) throw new Error("Erro na requisição");
        
        const dados = await resposta.json();

        const campoAula = document.getElementById("modulo-aula-id");
        const campoAula2 = document.getElementById("modulo-aula-id-2"); 
        const campoResumo = document.getElementById("modulo-resumo-texto");

        // PREENCHIMENTO DOS CAMPOS
        if (campoAula) campoAula.value = dados.aula ? dados.aula.url : "";
        
        // AJUSTE AQUI: Pega a url2 se ela existir na aula vinda do banco
        if (campoAula2) {
            campoAula2.value = (dados.aula && dados.aula.url2) ? dados.aula.url2 : "";
        }

        if (campoResumo) campoResumo.value = dados.resumo || "";

        renderizarSelecaoQuestoes(dados.questoes);

    } catch (erro) {
        console.error("❌ Erro ao buscar dados:", erro);
    }
}

/**
 * RENDERIZA LISTA DE CHECKBOXES (USADO PELO PROFESSOR)
 */
function renderizarSelecaoQuestoes(questoes) {
    const container = document.getElementById("lista-disponivel") || document.getElementById("lista-questoes-selecao");
    if (!container) return;
    
    container.innerHTML = "";

    if (!questoes || questoes.length === 0) {
        container.innerHTML = "<p style='color: gray; padding: 10px;'>Nenhuma questão encontrada.</p>";
        return;
    }

    questoes.forEach(q => {
        const textoQuestao = q.enunciado || "Questão sem descrição";
        const item = document.createElement("div");
        item.style = "border-bottom: 1px solid #eee; padding: 10px; margin-bottom: 5px;";

        item.innerHTML = `
            <label style="display: flex; align-items: flex-start; gap: 12px; cursor: pointer;">
                <input type="checkbox" class="check-questao questoes-selecionadas" value="${q.id}" checked style="width: 18px; height: 18px;">
                <div>
                    <span style="font-weight: bold; color: #3498db; display: block;">ID: ${q.id}</span>
                    <span style="font-size: 14px; color: #444;">${textoQuestao.substring(0, 100)}...</span>
                </div>
            </label>
        `;
        container.appendChild(item);
    });
}

/**
 * SALVA O MÓDULO FINAL (PROFESSOR)
 */
export async function finalizarModulo() {
    const disciplina = document.getElementById("construtor-disciplina").value;
    const tema = document.getElementById("construtor-tema").value;
    const aulaUrl = document.getElementById("modulo-aula-id")?.value;
    const aulaUrl2 = document.getElementById("modulo-aula-id-2")?.value; // Captura vídeo 2
    const resumo = document.getElementById("modulo-resumo-texto")?.value || document.getElementById("construtor-resumo")?.value;
    
    const checkboxes = document.querySelectorAll(".check-questao:checked, .questoes-selecionadas:checked");
    const questoesSelecionadas = Array.from(checkboxes).map(cb => cb.value);

    if (!disciplina || !tema || questoesSelecionadas.length === 0) {
        alert("⚠️ Preencha disciplina, tema e selecione ao menos uma questão!");
        return;
    }

    const dadosFinal = {
        disciplina: disciplina,
        tema: tema,
        aula_url: aulaUrl,
        aula_url_2: aulaUrl2, // Enviando segundo vídeo para o banco
        resumo: resumo,
        questoes_ids: questoesSelecionadas
    };

    try {
        const response = await fetch('http://localhost:3000/modulos/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosFinal)
        });

        if (response.ok) alert("🚀 Módulo criado com sucesso!");
        else alert("❌ Erro ao salvar módulo.");
    } catch (erro) {
        console.error("Erro ao salvar módulo:", erro);
    }
}

/**
 * VISUALIZAÇÃO DO MÓDULO (ALUNO)
 */
export async function carregarModuloCompleto() {
    const selectDisc = document.getElementById("view-disciplina");
    const selectTema = document.getElementById("view-tema");

    if (!selectDisc?.value || !selectTema?.value) {
        alert("Selecione disciplina e tema!");
        return;
    }

    try {
        const url = `http://localhost:3000/modulos/visualizar?disciplina=${selectDisc.value}&tema=${selectTema.value}`;
        const resposta = await fetch(url);
        
        if (!resposta.ok) {
            alert("Módulo não encontrado!");
            return;
        }

        const modulo = await resposta.json();
        questoesAtuaisDoModulo = modulo.questoes_completas;

        document.getElementById("conteudo-modulo-pronto").style.display = "block";

        // --- Lógica Vídeo 1 ---
        const videoIframe = document.getElementById("video-final");
        let urlEmbed1 = modulo.aula_url || "";
        if (urlEmbed1.includes("watch?v=")) urlEmbed1 = urlEmbed1.replace("watch?v=", "embed/");
        videoIframe.src = urlEmbed1;

        // --- Lógica Vídeo 2 (Novo) ---
        const boxVideo2 = document.getElementById("box-video-2");
        const videoIframe2 = document.getElementById("video-final-2");
        let urlEmbed2 = modulo.aula_url_2 || "";

        if (urlEmbed2 && urlEmbed2.trim() !== "") {
            if (urlEmbed2.includes("watch?v=")) urlEmbed2 = urlEmbed2.replace("watch?v=", "embed/");
            videoIframe2.src = urlEmbed2;
            boxVideo2.style.display = "block";
        } else {
            boxVideo2.style.display = "none";
            videoIframe2.src = "";
        }

        // Resumo
        document.getElementById("area-resumo-aluno").innerHTML = `
            <div style="background: #fffbe6; padding: 20px; border-left: 5px solid #f1c40f; border-radius: 8px; margin-bottom: 25px;">
                <h2 style="margin-top:0;">📝 Resumo da Aula</h2>
                <p>${modulo.resumo}</p>
            </div>
        `;

        // Questões
        const listaQuestoes = document.getElementById("lista-questoes-aluno");
        listaQuestoes.innerHTML = `<h2>✍️ Exercícios</h2>`;
        
        questoesAtuaisDoModulo.forEach((q, i) => {
            const card = document.createElement("div");
            card.className = "card-questao";
            card.style = "border: 1px solid #ccc; padding: 20px; margin-bottom: 20px; border-radius: 8px; background: #f9f9f9;";
            card.innerHTML = `
                <h3>Questão ${i + 1}</h3>
                <p>${q.enunciado}</p>
                <div class="alternativas">
                    ${q.alternativas.map((alt, index) => `
                        <label style="display: block; margin-bottom: 8px;">
                            <input type="radio" name="questao-aluno-${i}" value="${index}">
                            <span>${String.fromCharCode(65 + index)}) ${alt}</span>
                        </label>
                    `).join('')}
                </div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-resp-final" data-index="${i}" style="background:#28a745; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;">Responder</button>
                    <button class="btn-ver-final" data-index="${i}" style="background:#007bff; color:white; border:none; padding:8px; border-radius:4px; cursor:pointer;">Ver Gabarito</button>
                </div>
                <p id="res-final-${i}" style="font-weight: bold; margin-top: 10px;"></p>
            `;
            listaQuestoes.appendChild(card);
        });

        configurarBotoesFinais();

    } catch (erro) {
        console.error("Erro ao carregar módulo:", erro);
    }
}

function configurarBotoesFinais() {
    document.querySelectorAll('.btn-resp-final').forEach(btn => {
        btn.onclick = () => {
            const i = btn.dataset.index;
            const q = questoesAtuaisDoModulo[i];
            const feedback = document.getElementById(`res-final-${i}`);
            const marcado = document.querySelector(`input[name="questao-aluno-${i}"]:checked`);

            if (!marcado) return alert("Selecione uma opção!");

            const correto = q.alternativas[marcado.value].trim() === q.resposta_correta.trim();
            feedback.innerHTML = correto ? "✅ Correto!" : `❌ Errado! Gabarito: ${q.resposta_correta}`;
            feedback.style.color = correto ? "green" : "red";
        };
    });

    document.querySelectorAll('.btn-ver-final').forEach(btn => {
        btn.onclick = () => {
            const i = btn.dataset.index;
            document.getElementById(`res-final-${i}`).innerHTML = `Gabarito: ${questoesAtuaisDoModulo[i].resposta_correta}`;
            document.getElementById(`res-final-${i}`).style.color = "blue";
        };
    });
}