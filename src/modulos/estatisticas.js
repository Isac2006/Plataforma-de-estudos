// --- modulos/estatisticas.js ---

export async function atualizarEstatisticas(nomeUsuario) {
    if (!nomeUsuario || nomeUsuario === "Visitante") return;

    try {
        const resposta = await fetch(`http://localhost:3000/usuario/dados?nome=${nomeUsuario}`);
        if (!resposta.ok) throw new Error("Usuário não encontrado");
        
        const user = await resposta.json();

        // 1. Extração segura de dados
        const estQuestoes = user.estatisticas?.questoes || { totalAcertos: 0, totalErros: 0, porMateria: {} };
        const acertos = estQuestoes.totalAcertos || 0;
        const erros = estQuestoes.totalErros || 0;
        const totalTentativas = acertos + erros;

        // 2. Atualiza contadores gerais
        const atualizarCampo = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.innerText = valor;
        };

        atualizarCampo("stats-questoes", totalTentativas);
        atualizarCampo("stats-aulas", user.aulasAssistidas || 0);
        atualizarCampo("stats-redacoes", user.redacoesFeitas || 0);
        
        // 3. Taxa de Acerto Geral
        const elTaxa = document.getElementById("stats-taxa-geral");
        if (elTaxa) {
            const taxa = totalTentativas > 0 ? ((acertos / totalTentativas) * 100).toFixed(1) : "0.0";
            elTaxa.innerText = `${taxa}%`;
        }

        // 4. Detalhes por Matéria (Lista Dinâmica)
        const listaMaterias = document.getElementById("lista-taxas-materias");
        if (listaMaterias) {
            listaMaterias.innerHTML = ""; 
            const materiasMap = estQuestoes.porMateria || {};

            Object.entries(materiasMap).forEach(([materia, dados]) => {
                const totalMat = dados.acertos + dados.erros;
                const percMat = totalMat > 0 ? ((dados.acertos / totalMat) * 100).toFixed(0) : 0;
                
                const li = document.createElement("li");
                li.style = "background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #1976d2; font-size: 13px; list-style:none;";
                li.innerHTML = `<strong>${materia.toUpperCase()}</strong><br>${dados.acertos} acertos de ${totalMat} (${percMat}%)`;
                listaMaterias.appendChild(li);
            });
        }

        console.log(`✅ Estatísticas de ${nomeUsuario} sincronizadas.`);

    } catch (erro) {
        console.error("❌ Erro ao atualizar painel:", erro);
    }
}

// Chame esta função sempre que o aluno acertar/errar uma questão
export async function registrarRespostaQuestao(usuario, disciplina, acertou) {
    try {
        await fetch('http://localhost:3000/usuario/registrar-resposta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, disciplina, acertou })
        });
        await atualizarEstatisticas(usuario);
    } catch (e) {
        console.error("Erro ao registrar resposta:", e);
    }
}

// Chame esta para Aulas ("aulasAssistidas") ou Redações ("redacoesFeitas")
export async function registrarProgresso(nomeUsuario, campo) {
    try {
        await fetch('http://localhost:3000/usuario/incrementar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: nomeUsuario, campo: campo })
        });
        await atualizarEstatisticas(nomeUsuario);
    } catch (e) {
        console.error("Erro ao incrementar progresso:", e);
    }
}