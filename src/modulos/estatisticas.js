// --- modulos/estatisticas.js ---

export async function atualizarEstatisticas() {
    const idUsuario = localStorage.getItem("usuarioId");
    const nomeUsuario = localStorage.getItem("nomeUsuario");

    if (!idUsuario || idUsuario === "undefined" || idUsuario === "null" || nomeUsuario === "Visitante") {
        console.warn("⚠️ Estatísticas: Usuário não identificado.");
        return;
    }

    try {
        const resposta = await fetch(`http://localhost:3000/usuario/dados?id=${idUsuario}`);
        
        if (!resposta.ok) throw new Error(`Erro ${resposta.status}: Falha ao buscar dados.`);
        
        const user = await resposta.json();

        // Extração de dados
        const estQuestoes = user.estatisticas?.questoes || { totalAcertos: 0, totalErros: 0, porMateria: {} };
        const acertos = Number(estQuestoes.totalAcertos) || 0;
        const erros = Number(estQuestoes.totalErros) || 0;
        const totalTentativas = acertos + erros;

        // UI Helpers
        const atualizarCampo = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.innerText = valor;
        };

        atualizarCampo("stats-questoes", totalTentativas);
        atualizarCampo("stats-aulas", user.aulasAssistidas || 0);
        atualizarCampo("stats-redacoes", user.redacoesFeitas || 0);
        
        const elTaxa = document.getElementById("stats-taxa-geral");
        if (elTaxa) {
            const taxa = totalTentativas > 0 ? ((acertos / totalTentativas) * 100).toFixed(1) : "0.0";
            elTaxa.innerText = `${taxa}%`;
        }

        const listaMaterias = document.getElementById("lista-taxas-materias");
        if (listaMaterias) {
            listaMaterias.innerHTML = ""; 
            const materiasMap = estQuestoes.porMateria || {};

            Object.entries(materiasMap).forEach(([materia, dados]) => {
                const mAcertos = Number(dados.acertos) || 0;
                const mErros = Number(dados.erros) || 0;
                const totalMat = mAcertos + mErros;
                const percMat = totalMat > 0 ? ((mAcertos / totalMat) * 100).toFixed(0) : 0;
                
                const li = document.createElement("li");
                li.style = "background: #f8f9fa; padding: 10px; border-radius: 6px; border-left: 4px solid #1976d2; font-size: 13px; list-style:none; margin-bottom: 5px;";
                li.innerHTML = `<strong>${materia.toUpperCase()}</strong><br>${mAcertos} acertos de ${totalMat} (${percMat}%)`;
                listaMaterias.appendChild(li);
            });
        }
    } catch (erro) {
        console.error("❌ Erro ao atualizar painel:", erro.message);
    }
}

// CORREÇÃO AQUI: Mudamos idUsuario para usuarioId e acertou para correta (Padrão de Servidor)
export async function registrarRespostaQuestao(idUsuario, disciplina, acertou) {
    if (!idUsuario || idUsuario === "undefined" || idUsuario === "null") return;

    try {
        const resposta = await fetch('http://localhost:3000/usuario/registrar-resposta', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Enviamos as variações mais comuns para garantir que o servidor aceite
            body: JSON.stringify({ 
                usuarioId: idUsuario,    // Opção 1
                idUsuario: idUsuario,    // Opção 2
                disciplina: disciplina, 
                correta: acertou,        // Opção 1
                acertou: acertou         // Opção 2
            })
        });

        if (!resposta.ok) {
            const erroRes = await resposta.json();
            throw new Error(erroRes.erro || erroRes.mensagem || "Erro 400");
        }
        
        await atualizarEstatisticas();
    } catch (e) {
        console.error("❌ Erro ao registrar resposta:", e.message);
    }
}

export async function registrarProgresso(idUsuario, campo) {
    if (!idUsuario || idUsuario === "undefined" || !campo) return;

    try {
        const resposta = await fetch('http://localhost:3000/usuario/incrementar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                usuarioId: idUsuario, // Variação 1
                idUsuario: idUsuario, // Variação 2
                campo: campo 
            })
        });

        if (!resposta.ok) {
            const erroJson = await resposta.json();
            throw erroJson;
        }

        await atualizarEstatisticas();
    } catch (e) {
        console.error("❌ Erro ao incrementar progresso:", e);
    }
}