// --- CONFIGURAÇÕES DO MÓDULO ---
const metasAlvo = {
    "Matemática": 8, "Português": 6, "Redação": 4, "Física": 4, "Química": 4,
    "Biologia": 4, "História": 3, "Geografia": 3, "Filosofia": 2, "Sociologia": 2, "Inglês": 2
};

const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// --- FUNÇÕES DE INICIALIZAÇÃO ---

/**
 * Cria a estrutura da tabela e ativa os ouvintes de eventos
 */
export function inicializarCronograma() {
    const tbody = document.querySelector('#cronograma tbody');
    if (!tbody) return;

    tbody.innerHTML = ''; // Limpa antes de gerar

    for (let h = 7; h <= 23; h++) {
        const horaStr = String(h).padStart(2, '0') + ':00';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="hora">${horaStr}</td>` +
            dias.map(dia => `<td data-dia="${dia}" data-hora="${horaStr}"></td>`).join('');
        tbody.appendChild(tr);
    }

    configurarInteracoes();
    atualizarMetas();
}

function configurarInteracoes() {
    // Drag over e Drop nas células
    document.querySelectorAll('td:not(.hora)').forEach(td => {
        td.addEventListener('dragover', e => e.preventDefault());
        td.addEventListener('drop', e => {
            e.preventDefault();
            const mat = e.dataTransfer.getData("text/plain");
            if (mat) adicionarMateria(td, mat);
        });
    });

    // Itens arrastáveis (Lista de matérias)
    document.querySelectorAll('.materia').forEach(m => {
        m.addEventListener('dragstart', e => {
            e.dataTransfer.setData("text/plain", m.dataset.materia);
        });
    });
}

// --- LÓGICA DE MANIPULAÇÃO DA TABELA ---

export function adicionarMateria(td, materia) {
    td.dataset.materia = materia;
    td.dataset.status = "pendente";
    td.innerHTML = `
        <div class="bloco pendente" onclick="alternarStatus(this.parentElement)">
            <button class="btn-remover" onclick="event.stopPropagation(); removerMateria(this.parentElement.parentElement)">×</button>
            <b>${materia}</b>
        </div>`;
    atualizarMetas();
}

export function alternarStatus(td) {
    if (!td || !td.dataset.materia) return;
    td.dataset.status = (td.dataset.status === "pendente") ? "concluido" : "pendente";
    const bloco = td.querySelector('.bloco');
    if (bloco) bloco.className = `bloco ${td.dataset.status}`;
    atualizarMetas();
}

export function removerMateria(td) {
    td.innerHTML = "";
    delete td.dataset.materia;
    delete td.dataset.status;
    atualizarMetas();
}

// --- CÁLCULOS E METAS ---

export function atualizarMetas() {
    const dados = {};
    for (const m in metasAlvo) dados[m] = { planejado: 0, concluido: 0 };

    let totalP = 0, totalC = 0;

    document.querySelectorAll('td[data-materia]').forEach(td => {
        const m = td.dataset.materia;
        if (dados[m]) {
            dados[m].planejado++;
            totalP++;
            if (td.dataset.status === "concluido") {
                dados[m].concluido++;
                totalC++;
            }
        }
    });

    // Atualiza cabeçalho de totais
    const elP = document.getElementById('totalPlanejado');
    const elC = document.getElementById('totalConcluido');
    if (elP) elP.textContent = totalP + "h";
    if (elC) elC.textContent = totalC + "h";

    // Atualiza a lista visual de metas
    const ul = document.getElementById('listaMetas');
    if (!ul) return;
    ul.innerHTML = '';

    for (const m in metasAlvo) {
        const { concluido, planejado } = dados[m];
        const meta = metasAlvo[m];
        
        let classe = 'falta';
        if (concluido >= meta) classe = 'ok';
        else if (planejado > 0) classe = 'em-progresso';

        const li = document.createElement('li');
        li.className = classe;
        li.innerHTML = `
            <strong>${m}</strong>
            <div class="status-badge">
                <span>Feito: <b>${concluido}h</b></span>
                <span>Total: <b>${planejado}h</b></span>
                <span>Meta: <b>${meta}h</b></span>
            </div>
        `;
        ul.appendChild(li);
    }
}

// --- COMUNICAÇÃO COM O SERVIDOR (FETCH) ---

export async function salvarCronograma() {
    const usuarioEl = document.getElementById('nomeUsuario') || { value: "Joao" };
    const usuario = usuarioEl.value;
    
    if (!usuario) {
        alert("Por favor, digite o nome do usuário.");
        return;
    }

    const itensCronograma = [];
    document.querySelectorAll('td[data-materia]').forEach(td => {
        itensCronograma.push({
            dia: td.dataset.dia,
            hora: td.dataset.hora,
            materia: td.dataset.materia,
            status: td.dataset.status
        });
    });

    const payload = {
        usuario: usuario,
        totalHoras: itensCronograma.length,
        cronograma: itensCronograma
    };

    try {
        const response = await fetch('http://localhost:3000/salvar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) alert("✅ Cronograma salvo com sucesso!");
        else alert("❌ Erro ao salvar.");
    } catch (error) {
        console.error("Erro ao salvar:", error);
    }
}

/**
 * Registra o estudo no servidor e pinta a tabela na hora
 */
export async function registrarEstudoAutomatico(nomeUsuario, materiaEstudada) {
    try {
        const response = await fetch('http://localhost:3000/registrar-estudo-agora', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: nomeUsuario, materia: materiaEstudada })
        });

        if (response.ok) {
            const dados = await response.json(); // O servidor devolve { dia, hora, mensagem }

            // 1. ATUALIZAÇÃO VISUAL DA TABELA
            const celula = document.querySelector(`td[data-dia="${dados.dia}"][data-hora="${dados.hora}"]`);
            
            if (celula) {
                // Preenche o quadradinho e coloca a classe 'concluido' (verde)
                adicionarMateria(celula, materiaEstudada); 
                celula.dataset.status = "concluido";
                const bloco = celula.querySelector('.bloco');
                if (bloco) bloco.className = "bloco concluido";
                
                console.log("✨ Interface atualizada visualmente!");
            }

            // 2. ATUALIZAÇÃO DOS CONTADORES E METAS
            atualizarMetas(); 
        }
    } catch (erro) {
        console.error("Erro ao atualizar visualização:", erro);
    }
}
// --- REGISTRO GLOBAL ---
// Necessário para que os 'onclick' e 'onchange' no HTML continuem funcionando
window.alternarStatus = alternarStatus;
window.removerMateria = removerMateria;
window.salvarCronograma = salvarCronograma;
window.registrarEstudoAutomatico = registrarEstudoAutomatico;