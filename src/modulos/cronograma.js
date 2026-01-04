// --- CONFIGURAÇÕES DO MÓDULO ---
const metasAlvo = {
    "Matemática": 8, "Português": 6, "Redação": 4, "Física": 4, "Química": 4,
    "Biologia": 4, "História": 3, "Geografia": 3, "Filosofia": 2, "Sociologia": 2, "Inglês": 2
};

const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

// --- FUNÇÕES DE INICIALIZAÇÃO ---

export async function inicializarCronograma() {
    const tbody = document.querySelector('#cronograma tbody');
    if (!tbody) return;

    // Recupera o ID do usuário logado
    const idUsuario = localStorage.getItem("usuarioId");

    // 1. Gera a estrutura visual vazia
    tbody.innerHTML = ''; 
    for (let h = 7; h <= 23; h++) {
        const horaStr = String(h).padStart(2, '0') + ':00';
        const tr = document.createElement('tr');
        tr.innerHTML = `<td class="hora">${horaStr}</td>` +
            dias.map(dia => `<td data-dia="${dia}" data-hora="${horaStr}" class="celula-horario"></td>`).join('');
        tbody.appendChild(tr);
    }

    // Segurança: Se não houver ID válido, ativa apenas interações locais (modo offline/visitante)
    if (!idUsuario || idUsuario === "undefined" || idUsuario === "null") {
        console.warn("Cronograma: Usuário não identificado. Operando em modo local.");
        configurarInteracoes();
        return;
    }

    // 2. Busca os dados salvos do usuário no servidor por ID
    try {
        const resposta = await fetch(`http://localhost:3000/usuario/dados?id=${idUsuario}`);
        if (!resposta.ok) throw new Error("Erro ao buscar dados do cronograma");
        
        const dadosUsuario = await resposta.json();

        if (dadosUsuario.cronograma && Array.isArray(dadosUsuario.cronograma)) {
            // 3. Preenche as células com as matérias salvas
            dadosUsuario.cronograma.forEach(item => {
                const seletor = `td[data-dia="${item.dia}"][data-hora="${item.hora}"]`;
                const celula = tbody.querySelector(seletor);
                
                if (celula) {
                    // Define o status antes de chamar adicionarMateria para o HTML vir correto
                    celula.dataset.status = item.status || "pendente";
                    adicionarMateria(celula, item.materia);
                }
            });
        }
    } catch (erro) {
        console.error("❌ Erro ao carregar dados do cronograma:", erro);
    }

    // 4. Ativa as funções de clique e cálculos
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
            if (mat) {
                // Ao dropar uma matéria nova, ela sempre começa como pendente
                td.dataset.status = "pendente"; 
                adicionarMateria(td, mat);
            }
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
    if (!materia) return;
    td.dataset.materia = materia;
    
    // Fallback de status
    const status = td.dataset.status || "pendente";

    td.innerHTML = `
        <div class="bloco ${status}" onclick="alternarStatus(this.parentElement)">
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

    // Seleciona apenas células que possuem uma matéria atribuída
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

    // Atualiza contadores globais
    const elP = document.getElementById('totalPlanejado');
    const elC = document.getElementById('totalConcluido');
    if (elP) elP.textContent = totalP + "h";
    if (elC) elC.textContent = totalC + "h";

    // Atualiza lista visual de metas
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
                <span>Planejado: <b>${planejado}h</b></span>
                <span>Meta: <b>${meta}h</b></span>
            </div>
        `;
        ul.appendChild(li);
    }
}

// --- COMUNICAÇÃO COM O SERVIDOR ---

export async function salvarCronograma() {
    const idUsuario = localStorage.getItem("usuarioId");
    
    if (!idUsuario || idUsuario === "undefined") {
        alert("⚠️ Erro: Usuário não identificado. Por favor, faça login novamente.");
        return;
    }

    const itensCronograma = [];
    // Coleta apenas células que possuem dados preenchidos
    document.querySelectorAll('td[data-materia]').forEach(td => {
        itensCronograma.push({
            dia: td.dataset.dia,
            hora: td.dataset.hora,
            materia: td.dataset.materia,
            status: td.dataset.status || "pendente"
        });
    });

    try {
        const response = await fetch('http://localhost:3000/salvar', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                idUsuario: idUsuario, 
                cronograma: itensCronograma 
            })
        });

        if (response.ok) {
            alert(`✅ Cronograma salvo com sucesso!`);
        } else {
            throw new Error("Erro ao salvar no servidor");
        }
    } catch (error) {
        console.error("❌ Erro ao salvar cronograma:", error);
        alert("❌ Falha ao conectar com o servidor.");
    }
}

export async function registrarEstudoAutomatico(materiaEstudada) {
    const idUsuario = localStorage.getItem("usuarioId");
    if (!idUsuario || idUsuario === "undefined") return;

    try {
        const response = await fetch('http://localhost:3000/registrar-estudo-agora', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idUsuario, materia: materiaEstudada })
        });

        if (response.ok) {
            const dados = await response.json(); 
            const celula = document.querySelector(`td[data-dia="${dados.dia}"][data-hora="${dados.hora}"]`);
            
            if (celula) {
                celula.dataset.status = "concluido";
                adicionarMateria(celula, materiaEstudada);
            }
            atualizarMetas(); 
        }
    } catch (erro) {
        console.error("❌ Erro ao registrar estudo automático:", erro);
    }
}

// --- REGISTRO GLOBAL ---
window.alternarStatus = alternarStatus;
window.removerMateria = removerMateria;
window.salvarCronograma = salvarCronograma;
window.registrarEstudoAutomatico = registrarEstudoAutomatico;