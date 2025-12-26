// --- modulos/estatisticas.js ---

export async function atualizarEstatisticas(nomeUsuario) {
    if (!nomeUsuario || nomeUsuario === "Visitante") return;

    try {
        const resposta = await fetch(`http://localhost:3000/usuario/dados?nome=${nomeUsuario}`);
        const user = await resposta.json();

        // 1. Pega o total de questões (Tenta primeiro o campo solto, se não tiver, tenta o das estatísticas)
        const questoesSoltas = user.questoesFeitas || 0;
        const est = user.estatisticas?.questoes || {};
        const acertos = est.totalAcertos || 0;
        const erros = est.totalErros || 0;
        
        // Soma o que for maior ou o que existir
        const totalQuestoes = questoesSoltas > (acertos + erros) ? questoesSoltas : (acertos + erros);

        // 2. Atualiza o HTML (Certifique-se que esses IDs existem no seu HTML)
        const atualizarCampo = (id, valor) => {
            const el = document.getElementById(id);
            if (el) el.innerText = valor;
        };

        atualizarCampo("stats-questoes", totalQuestoes);
        atualizarCampo("stats-aulas", user.aulasAssistidas || 0);
        atualizarCampo("stats-redacoes", user.redacoesFeitas || 0);
        
        // 3. Calcula taxa de acerto
        const elTaxa = document.getElementById("stats-taxa-geral");
        if (elTaxa) {
            const taxa = totalQuestoes > 0 ? ((acertos / totalQuestoes) * 100).toFixed(1) : "0.0";
            elTaxa.innerText = `${taxa}%`;
        }

        console.log(`✅ Interface atualizada para ${nomeUsuario}`);

    } catch (erro) {
        console.error("❌ Erro ao renderizar estatísticas:", erro);
    }
}
export async function registrarRespostaQuestao(usuario, disciplina, acertou) {
    await fetch('http://localhost:3000/usuario/registrar-resposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, disciplina, acertou })
    });
    atualizarEstatisticas(usuario);
}
// Função para incrementar dados (Chamar quando o aluno responder questão, ver aula, etc)
export async function registrarProgresso(nomeUsuario, campo) {
    try {
        await fetch('http://localhost:3000/usuario/incrementar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: nomeUsuario, campo: campo })
        });
        atualizarEstatisticas(nomeUsuario); // Atualiza a tela após salvar
    } catch (erro) {
        console.error("Erro ao registrar progresso:", erro);
    }
}