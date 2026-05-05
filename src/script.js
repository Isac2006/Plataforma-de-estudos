// 1. Importação de funções externas
import { aparecerquestoes } from './modulos/questoes.js';
import { cadastrarMateria } from './modulos/cadastrarmateria.js';
import { destacar, enviarRedacao, consultarMinhaRedacao, buscarProximaFila, salvarCorrecaoProfessor } from './modulos/redaçao.js';
import { cadastrarAula, carregarAula } from './modulos/aula.js';
import { buscarDadosParaModulo, finalizarModulo, carregarModuloCompleto } from './modulos/construtor.js';
import { inicializarCronograma, salvarCronograma, registrarEstudoAutomatico } from './modulos/cronograma.js';
import { atualizarEstatisticas, registrarProgresso } from './modulos/estatisticas.js';
import GerenciadorEducacional from './modulos/gerenciador.js';




// --- LÓGICA DE IDENTIDADE (LOGIN) ---
let usuarioLogado = localStorage.getItem("nomeUsuario");

// Função mestra para carregar os dados do servidor
async function carregarTudo(nome) {
    if (!nome || nome === "Visitante") return;
    console.log("🚀 Carregando dados para:", nome);
    try {
        // Usamos Promise.all para carregar ambos ao mesmo tempo e ganhar velocidade
        await Promise.all([
            atualizarEstatisticas(nome),
            inicializarCronograma(nome)
        ]);
    } catch (erro) {
        console.error("❌ Erro ao carregar dados do usuário:", erro);
    }
}

// Verifica o login antes de qualquer coisa
if (!usuarioLogado) {
    let nomeDigitado = "visitante"
    if (nomeDigitado && nomeDigitado.trim() !== "") {
        usuarioLogado = nomeDigitado.trim();
        localStorage.setItem("nomeUsuario", usuarioLogado);
    } else {
        usuarioLogado = "Visitante";
    }
}

// --- INICIALIZAÇÃO CONTROLADA ---
// Tudo o que mexe no HTML deve estar dentro do DOMContentLoaded
document.addEventListener("DOMContentLoaded", async () => {
    // 1. Atualiza o nome na interface
    const elNome = document.getElementById("nome-exibicao");
    if (elNome) {
        elNome.innerHTML = `Olá, <strong>${usuarioLogado}</strong>!`;
    }

    // 2. AGORA SIM, carrega os dados (Estatísticas e Cronograma)
    // Chamamos aqui porque os elementos HTML já existem
    await carregarTudo(usuarioLogado);
});

// Botão de Trocar Usuário
window.trocarUsuario = () => {
    // 1. Limpa o nome do usuário do navegador
    localStorage.removeItem("nomeUsuario");
    
    // 2. Opcional: Limpa os dados da interface antes de recarregar (evita "flash" de dados antigos)
    const campos = ["stats-questoes", "stats-aulas", "stats-redacoes", "stats-taxa-geral"];
    campos.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerText = id.includes('taxa') ? "0%" : "0";
    });
    
    const lista = document.getElementById("lista-taxas-materias");
    if (lista) lista.innerHTML = "";

    // 3. Força o recarregamento para o estado de "Visitante"
    location.reload();
};

// --- EXPOSIÇÃO DE FUNÇÕES GLOBAIS ---
window.destacar = destacar;
window.enviarRedacao = enviarRedacao;
window.consultarMinhaRedacao = consultarMinhaRedacao;
window.buscarProximaFila = buscarProximaFila;
window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;
window.aparecerquestoes = aparecerquestoes;




// --- LÓGICA DE TEMAS DINÂMICOS ---
const selectDiciplina = document.getElementById("diciplinapedido");
const selectTema = document.getElementById("temapedido");

if (selectDiciplina && selectTema) {
    selectDiciplina.addEventListener("change", async () => {
        const disciplina = selectDiciplina.value;

        if (!disciplina) {
            selectTema.innerHTML = '<option value="">Selecione uma matéria primeiro</option>';
            selectTema.disabled = true;
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/temas?disciplina=${disciplina}`);
            const temas = await resposta.json();

            selectTema.innerHTML = '<option value="">Selecione o tema</option>';
            selectTema.disabled = false;

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema.toLowerCase();
                option.textContent = tema;
                selectTema.appendChild(option);
            });

        } catch (erro) {
            console.error("❌ Erro ao carregar temas:", erro);
            selectTema.innerHTML = '<option value="">Erro ao carregar temas</option>';
        }
    });
}

// --- CONFIGURAÇÃO DOS OUVINTES DE CLIQUE (EVENT LISTENERS) ---



// Botão para cadastrar questão (Ajustado para evitar ReferenceError)
const btnSalvar = document.getElementById("btn-salvar-questao");
if (btnSalvar) {
    btnSalvar.addEventListener("click", cadastrarQuestao);
}

// Botão para cadastrar matéria
const btnCadastrarMateria = document.getElementById("btn-cadastrar-materia");
if (btnCadastrarMateria) {
    btnCadastrarMateria.addEventListener("click", cadastrarMateria);
}

// --- FUNÇÃO DE CADASTRO ---





// redação 



document.getElementById('btnDestacar').addEventListener('click', destacar);
// Registra globalmente para que o 'onclick' do HTML encontre as funções
    window.destacar = destacar;
    window.enviarRedacao = enviarRedacao;
    window.consultarMinhaRedacao = consultarMinhaRedacao;
    window.buscarProximaFila = buscarProximaFila;
    window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;



// aula nao mexer por enquanto
// --- CONFIGURAÇÃO AULAS/VÍDEOS ---

// --- LÓGICA DE TEMAS DINÂMICOS PARA AULAS (ALUNO) ---

// Botão de Salvar (Professor)
const btnSalvarAula = document.getElementById("btn-salvar-aula");
if (btnSalvarAula) {
    // Removemos qualquer onclick antigo e adicionamos o evento via JS
    btnSalvarAula.onclick = null; 
    btnSalvarAula.addEventListener("click", (e) => {
        e.preventDefault();
        cadastrarAula();
    });
}

// Botão de Buscar (Aluno)
const btnBuscarAula = document.getElementById("btn-buscar-aula");
if (btnBuscarAula) {
    btnBuscarAula.onclick = null;
    btnBuscarAula.addEventListener("click", async (e) => {
        e.preventDefault();
        
        // 1. Carrega o vídeo na tela
        await carregarAula(usuarioLogado);
        
        // 2. Pega a matéria selecionada e registra o estudo
        const disciplina = document.getElementById("select-disciplina").value;
        if (disciplina) {
            registrarEstudoAutomatico(usuarioLogado, disciplina);
            console.log(`Estudo registrado para ${usuarioLogado} na matéria ${disciplina}`);
        }
    });
}

// --- LÓGICA DO SELECT DINÂMICO (O código que você enviou) ---
const selectDisciplinaAula = document.getElementById("select-disciplina");
const selectTemaAula = document.getElementById("select-tema-aula");

if (selectDisciplinaAula && selectTemaAula) {
    selectDisciplinaAula.addEventListener("change", async () => {
        const disciplina = selectDisciplinaAula.value;

        if (!disciplina) {
            selectTemaAula.innerHTML = '<option value="">Selecione a matéria primeiro</option>';
            selectTemaAula.disabled = true;
            return;
        }

        try {
            const resposta = await fetch(`http://localhost:3000/aulas/temas?disciplina=${disciplina}`);
            const temas = await resposta.json();

            selectTemaAula.innerHTML = '<option value="">Selecione o tema da aula</option>';
            selectTemaAula.disabled = false;

            temas.forEach(tema => {
                const option = document.createElement("option");
                option.value = tema; 
                option.textContent = tema.charAt(0).toUpperCase() + tema.slice(1);
                selectTemaAula.appendChild(option);
            });

            if (temas.length === 0) {
                selectTemaAula.innerHTML = '<option value="">Nenhuma aula encontrada</option>';
                selectTemaAula.disabled = true;
            }
        } catch (erro) {
            console.error("❌ Erro ao carregar temas de aula:", erro);
        }
    });
}




// contruto de modulo 


console.log("✅ Script carregado com sucesso!");

// 2. Configuração Global (Para o onclick do HTML)
window.destacar = destacar;
window.enviarRedacao = enviarRedacao;
window.consultarMinhaRedacao = consultarMinhaRedacao;
window.buscarProximaFila = buscarProximaFila;
window.salvarCorrecaoProfessor = salvarCorrecaoProfessor;

// 3. Função de Cadastro de Questão (Única)
async function cadastrarQuestao() {
    const disciplinaEl = document.getElementById("ins-disciplina");
    const temaEl = document.getElementById("ins-tema");
    const enunciadoEl = document.getElementById("ins-enunciado");
    const respostaCorretaEl = document.getElementById("ins-correta");
    const inputsAlt = document.querySelectorAll(".alt-input");

    if (!disciplinaEl || !temaEl || !enunciadoEl || !respostaCorretaEl) return;

    const alternativas = Array.from(inputsAlt).map(input => input.value.trim());

    if (!disciplinaEl.value || !temaEl.value || !enunciadoEl.value || alternativas.includes("")) {
        alert("⚠️ Por favor, preencha todos os campos!");
        return;
    }

    const dados = {
        disciplina: disciplinaEl.value.toLowerCase().trim(),
        tema: temaEl.value.toLowerCase().trim(),
        enunciado: enunciadoEl.value.trim(),
        alternativas: alternativas,
        resposta_correta: respostaCorretaEl.value.trim()
    };

    try {
        const response = await fetch('http://localhost:3000/questoes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        if (response.ok) {
            alert("✅ Questão cadastrada com sucesso!");
            [disciplinaEl, temaEl, enunciadoEl, respostaCorretaEl].forEach(el => el.value = "");
            inputsAlt.forEach(el => el.value = "");
        }
    } catch (erro) {
        console.error("❌ Erro na conexão:", erro);
    }
}

// 4. Ouvintes de Eventos (Configurados uma única vez)
document.getElementById("gerar-questao")?.addEventListener("click", aparecerquestoes);
document.getElementById("btn-salvar-questao")?.addEventListener("click", cadastrarQuestao);
document.getElementById("btn-cadastrar-materia")?.addEventListener("click", cadastrarMateria);
document.getElementById('btnDestacar')?.addEventListener('click', destacar);

document.getElementById("btn-salvar-aula")?.addEventListener("click", (e) => {
    e.preventDefault();
    cadastrarAula();
});

document.getElementById("btn-buscar-aula")?.addEventListener("click", (e) => {
    e.preventDefault();
    carregarAula(usuarioLogado);
});

document.getElementById("construtor-tema")?.addEventListener("change", buscarDadosParaModulo);
document.getElementById("btn-salvar-modulo-completo")?.addEventListener("click", (e) => {
    e.preventDefault();
    finalizarModulo();
});

document.getElementById("btn-carregar-tudo")?.addEventListener("click", (e) => {
    e.preventDefault();
    carregarModuloCompleto();
});

// 5. Lógica de Selects Dinâmicos (Genérica)
async function atualizarTemas(idDisciplina, idTema, isAula = false) {
    const discEl = document.getElementById(idDisciplina);
    const temaEl = document.getElementById(idTema);
    if (!discEl || !temaEl) return;

    discEl.addEventListener("change", async () => {
        const disciplina = discEl.value;
        if (!disciplina) return;
        
        try {
            const rota = isAula ? 'aulas/temas' : 'temas';
            const res = await fetch(`http://localhost:3000/${rota}?disciplina=${disciplina}`);
            const temas = await res.json();
            
            temaEl.innerHTML = `<option value="">Selecione o tema${isAula ? ' da aula' : ''}</option>`;
            temaEl.disabled = false;

            temas.forEach(t => {
                const opt = document.createElement("option");
                opt.value = t;
                opt.textContent = isAula ? t.charAt(0).toUpperCase() + t.slice(1) : t;
                temaEl.appendChild(opt);
            });
        } catch (e) { console.error("Erro no select dinâmico:", e); }
    });
}

// Ativando os campos de tema
atualizarTemas("diciplinapedido", "temapedido");
atualizarTemas("construtor-disciplina", "construtor-tema");
atualizarTemas("view-disciplina", "view-tema");
atualizarTemas("select-disciplina", "select-tema-aula", true);






// cronograma 
// 3. Configure o botão de salvar:
const btnSalvarCronograma = document.querySelector(".btn-salvar");
if (btnSalvarCronograma) {
    btnSalvarCronograma.addEventListener("click", (e) => {
        e.preventDefault();
        salvarCronograma();
    });
}


// --- INICIALIZAÇÃO DE ESTATÍSTICAS ---
// Carrega os números assim que a página abre
atualizarEstatisticas(usuarioLogado);

// --- INTEGRAÇÃO COM OS EVENTOS ---

// Função auxiliar para pegar o ID sempre atualizado
const obterIdAtual = () => localStorage.getItem("usuarioId");

// 1. Ao clicar em Gerar/Ver Questão
document.getElementById("gerar-questao")?.addEventListener("click", () => {
    const id = obterIdAtual();
    if (id) {
        registrarProgresso(id, "questoesFeitas");
    }
});

// 2. Ao enviar uma Redação
document.getElementById("btnEnviarRedacao")?.addEventListener("click", () => {
    const id = obterIdAtual();
    if (id) {
        registrarProgresso(id, "redacoesFeitas");
    }
});

// 3. Ao carregar Módulo Completo
document.getElementById("btn-carregar-tudo")?.addEventListener("click", () => {
    const id = obterIdAtual();
    if (id) {
        // Incrementa módulos concluídos
        registrarProgresso(id, "modulosConcluidos");
    }
});

// 4. Registrar Aula (Exemplo de como você pode usar)
document.getElementById("btn-buscar-aula")?.addEventListener("click", () => {
    const id = obterIdAtual();
    if (id) {
        registrarProgresso(id, "aulasAssistidas");
    }
});
atualizarEstatisticas(usuarioLogado);









// ESTA É A LINHA QUE CORRIGE O ERRO:
// Ela torna a função visível para o onclick do botão no HTML
window.trocarUsuario = trocarUsuario;


function trocarUsuario() {
    localStorage.removeItem("nomeUsuario");
    location.reload();
}


window.trocarUsuario = trocarUsuario;

/* === PASSO 1 - adicionar campo de imagem === */
function addInputImagem() {
    const div = document.getElementById("inputs-imagens");
    if (!div) return;

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "URL da imagem (opcional)";
    input.classList.add("imagem-url");

    div.appendChild(input);
}

window.addInputImagem = addInputImagem;

// --- FUNÇÃO DE REGISTRO COMPLETA ---
async function finalizarRegistro() {
    // 1. Captura os elementos
    const nomeEl = document.getElementById("reg-nome");
    const emailEl = document.getElementById("reg-email");
    const senhaEl = document.getElementById("reg-pass");
    const cpfEl = document.getElementById("reg-cpf");
    const nascimentoEl = document.getElementById("reg-nascimento");

    // 2. Verifica se existem no DOM
    if (!nomeEl || !emailEl || !senhaEl || !cpfEl || !nascimentoEl) {
        console.error("❌ Erro: Campos não encontrados.");
        return;
    }

    // 3. Monta o objeto (Sincronizado com o seu server.js)
    const dados = {
        usuario: nomeEl.value.trim(), // O servidor espera 'usuario'
        senha: senhaEl.value.trim(),
        email: emailEl.value.trim(),
        cpf: cpfEl.value.trim(),
        nascimento: nascimentoEl.value,
        faculdade: "Não informado",
        curso: "Não informado"
    };

    // 4. Validação
    if (Object.values(dados).some(valor => valor === "")) {
        alert("⚠️ Por favor, preencha todos os campos!");
        return;
    }

    try {
        console.log("📤 Enviando dados:", dados);
        
        const resposta = await fetch('http://localhost:3000/auth/registrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        });

        const resultado = await resposta.json();

        if (resposta.ok) {
            // AQUI ESTAVA O ERRO: 
            // 1. Usamos 'dados.usuario' (o nome que você acabou de digitar)
            // 2. Ou 'resultado.usuario' (se o seu servidor retornar o nome)
            const nomeParaSalvar = resultado.usuario || dados.usuario;
            
            localStorage.setItem("nomeUsuario", nomeParaSalvar);
            
            alert(`✅ Sucesso! Bem-vindo(a), ${nomeParaSalvar}!`);
            location.reload(); 
        } else {
            // Exibe o erro vindo do servidor (ajustado para 'resultado.erro')
            alert("❌ Erro: " + (resultado.erro || resultado.error || "Falha ao registrar"));
        }
    } catch (erro) {
        console.error("❌ Erro na conexão:", erro);
        alert("O servidor não respondeu.");
    }
}

// --- ATIVAÇÃO DO BOTÃO ---
// Usamos delegação de evento para garantir que funcione mesmo se o HTML for dinâmico
document.addEventListener("click", (event) => {
    if (event.target && event.target.id === "btn-registrar-confirmar") {
        event.preventDefault();
        finalizarRegistro();
    }
});
// --- FUNÇÃO PARA REALIZAR LOGIN (MODIFICADA) ---
async function realizarLogin() {
    const emailEl = document.getElementById("auth-email");
    const senhaEl = document.getElementById("auth-pass");

    if (!emailEl || !senhaEl) return;

    const dadosEnvio = {
        email: emailEl.value.trim(),
        senha: senhaEl.value.trim()
    };

    try {
        const resposta = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dadosEnvio)
        });

        // --- ÚNICA LEITURA DO JSON ---
        const resultado = await resposta.json();

        if (resposta.ok) {
            console.log("Dados recebidos do servidor:", resultado);

            // 1. Pega o ID (do seu JSON arrumado o campo é 'id')
            const idParaSalvar = resultado.id || resultado._id;
            
            // 2. Pega o Nome
            const nomeParaSalvar = resultado.nome || resultado.usuario || "Usuário";

            if (idParaSalvar) {
                // 3. Salva no LocalStorage
                localStorage.setItem("usuarioId", idParaSalvar);
                localStorage.setItem("nomeUsuario", nomeParaSalvar);
                
                alert(`✅ Bem-vindo, ${nomeParaSalvar}!`);
                
                // 4. Redireciona
                window.location.href = "index.html"; 
            } else {
                console.error("Servidor não enviou o ID!", resultado);
                alert("Erro técnico: ID não encontrado nos dados do usuário.");
            }
        } else {
            // Caso o servidor retorne erro (senha errada, etc)
            alert("❌ " + (resultado.mensagem || resultado.erro || "Falha no login"));
        }

    } catch (erro) {
        console.error("❌ Erro de conexão:", erro);
        alert("Erro ao conectar com o servidor. Verifique se ele está rodando.");
    }
}
// --- ATIVAR O CLIQUE DO BOTÃO ---
document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "btn-login-confirmar") {
        e.preventDefault();
        realizarLogin();
    }
});



















// --- 2. INTEGRAÇÃO COM O SERVIDOR (API) ---
let gerenciador;

async function carregarDados() {
    try {
        const response = await fetch('/api/usuarios');
        const dados = await response.json();
        gerenciador = new GerenciadorEducacional(dados);
        renderUsers();
    } catch (err) {
        console.error("Erro ao carregar dados do servidor:", err);
        gerenciador = new GerenciadorEducacional([]); 
    }
}

async function salvarNoServidor() {
    try {
        await fetch('/api/usuarios', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gerenciador.getUsuarios())
        });
    } catch (err) {
        console.error("Erro ao salvar dados:", err);
    }
}

// --- 3. INTERFACE (DOM) ---
const userListDiv = document.getElementById('user-list');

function renderUsers() {
    if (!userListDiv) return;
    userListDiv.innerHTML = '';
    
    // Assumindo que 'user' agora tem uma propriedade '_id' ou 'id' vinda do banco
    gerenciador.getUsuarios().forEach(user => {
        // Usa o ID para identificar o usuário (ajuste para user._id se for MongoDB)
        const userId = user.id || user._id; 

        const card = document.createElement('div');
        card.className = `user-card ${user.acessoBloqueado ? 'blocked' : ''}`;
        card.innerHTML = `
            <div>
                <strong>${user.nome.toUpperCase()}</strong><br>
                <small>ID: ${userId}</small><br> <span>Progresso: ${user.progressoCurso}% | Aulas: ${user.aulasAssistidas}</span>
            </div>
            <div class="payment-status-container">
                ${Object.keys(user.pagamentos).map(m => `
                    <span class="status-tag ${user.pagamentos[m]}">
                        ${m.replace('mes', 'M')}: ${user.pagamentos[m]}
                    </span>
                `).join('')}
            </div>
            <div class="buttons">
                <button onclick="handleOpenEditModal('${userId}')" class="edit">Editar/Pagar</button>
                <button onclick="handleToggleBlock('${userId}')" class="toggle-block">
                    ${user.acessoBloqueado ? 'Desbloquear' : 'Bloquear'}
                </button>
                <button onclick="handleDelete('${userId}')" class="delete">Excluir</button>
            </div>
        `;
        userListDiv.appendChild(card);
    });
}
// --- 4. AÇÕES DOS BOTÕES E MODAIS ---

// Abrir Modal de Edição (BUSCA POR ID)
window.handleOpenEditModal = (id) => {
    // Você precisará atualizar seu arquivo 'gerenciador.js' para ter um método getUsuarioPorId
    // ou garantir que getUsuario procure pelo ID.
    const user = gerenciador.getUsuario(id); 
    
    if (!user) {
        console.error("Usuário não encontrado com ID:", id);
        return;
    }

    // Guardamos o ID num atributo data ou campo oculto para usar no salvamento
    document.getElementById('edit-user-original-name').dataset.id = id; 

    // Preencher campos (O resto continua igual)
    document.getElementById('editUserNameDisplay').textContent = user.nome;
    document.getElementById('edit-user-original-name').value = user.nome; // Apenas visual
    document.getElementById('edit-user-new-name').value = user.nome;
    document.getElementById('edit-user-email').value = user.email || '';
    document.getElementById('edit-user-aulas').value = user.aulasAssistidas || 0;
    // ... restante dos campos ...
    
    // ... código dos selects de pagamento ...
    
    document.getElementById('editUserModal').style.display = 'block';
};

// Salvar Edição (ENVIA O ID)
document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Recupera o ID que salvamos ao abrir o modal
    const idUsuario = document.getElementById('edit-user-original-name').dataset.id;
    
    const novosDados = {
        // Enviamos o ID para o gerenciador saber quem atualizar
        id: idUsuario, 
        nome: document.getElementById('edit-user-new-name').value,
        email: document.getElementById('edit-user-email').value,
        aulasAssistidas: parseInt(document.getElementById('edit-user-aulas').value) || 0,
        // ... outros campos
    };

    // Atualiza no gerenciador local usando ID
    gerenciador.editarUsuario(idUsuario, novosDados);
    
    // Salva no servidor
    await salvarNoServidor(); 
    
    document.getElementById('editUserModal').style.display = 'none';
    renderUsers();
});

// Bloquear/Desbloquear por ID
window.handleToggleBlock = async (id) => {
    gerenciador.alternarBloqueio(id); // O gerenciador deve buscar pelo ID
    await salvarNoServidor();
    renderUsers();
};

// Excluir por ID
window.handleDelete = async (id) => {
    if (confirm(`Tem certeza que deseja excluir este usuário? (ID: ${id})`)) {
        gerenciador.excluirUsuario(id); // O gerenciador deve excluir pelo ID
        await salvarNoServidor();
        renderUsers();
    }
};

// Salvar Dados do Modal
document.getElementById('edit-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nomeOriginal = document.getElementById('edit-user-original-name').value;
    
    const novosDados = {
        nome: document.getElementById('edit-user-new-name').value,
        email: document.getElementById('edit-user-email').value,
        aulasAssistidas: parseInt(document.getElementById('edit-user-aulas').value) || 0,
        redacoesFeitas: parseInt(document.getElementById('edit-user-redacoes').value) || 0,
        progressoCurso: parseInt(document.getElementById('edit-user-progresso').value) || 0
    };

    // Atualizar cada mês de pagamento
    for (let i = 1; i <= 6; i++) {
        const select = document.getElementById(`edit-pay-mes${i}`);
        if (select) {
            gerenciador.atualizarPagamento(nomeOriginal, i, select.value);
        }
    }

    gerenciador.editarUsuario(nomeOriginal, novosDados);
    await salvarNoServidor();
    document.getElementById('editUserModal').style.display = 'none';
    renderUsers();
});

// Bloquear/Desbloquear
window.handleToggleBlock = async (nome) => {
    gerenciador.alternarBloqueio(nome);
    await salvarNoServidor();
    renderUsers();
};

// Excluir
window.handleDelete = async (nome) => {
    if (confirm(`Tem certeza que deseja excluir o aluno ${nome}?`)) {
        gerenciador.excluirUsuario(nome);
        await salvarNoServidor();
        renderUsers();
    }
};

// Adicionar Novo Aluno (Formulário Principal)
document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const nome = document.getElementById('add-user-name').value;
    const email = document.getElementById('add-user-email').value;
    
    gerenciador.adicionarUsuario({ nome, email });
    await salvarNoServidor();
    e.target.reset();
    renderUsers();
});

// Fechar Modais
document.querySelectorAll('.close-button').forEach(btn => {
    btn.onclick = () => {
        document.getElementById('editUserModal').style.display = 'none';
        document.getElementById('redacoesModal').style.display = 'none';
    };
});

// Fechar modal ao clicar fora dele
window.onclick = (event) => {
    const editModal = document.getElementById('editUserModal');
    const redModal = document.getElementById('redacoesModal');
    if (event.target == editModal) editModal.style.display = "none";
    if (event.target == redModal) redModal.style.display = "none";
}
async function atualizarBarraDeProgresso(usuario) {
    try {
        // 1. Busca o total de aulas do servidor
        const resposta = await fetch('http://localhost:3000/api/total-aulas');
        const dados = await resposta.json();
        const totalAulas = dados.total || 1; // Evita divisão por zero

        // 2. Pega quantas o aluno já assistiu (do objeto usuário)
        const aulasAssistidas = usuario.aulasAssistidas || 0;

        // 3. Calcula a porcentagem
        let porcentagem = (aulasAssistidas / totalAulas) * 100;

        // Arredonda e limita a 100%
        porcentagem = Math.min(100, Math.round(porcentagem));

        console.log(`Progresso: ${aulasAssistidas}/${totalAulas} = ${porcentagem}%`);

        // 4. Atualiza a tela (ajuste os IDs conforme seu HTML)
        const barraProgresso = document.querySelector('.barra-progresso-preenchimento'); // ou o ID da sua barra
        const textoProgresso = document.querySelector('.texto-progresso'); // Onde fica o "45%"

        if (barraProgresso) {
            barraProgresso.style.width = `${porcentagem}%`;
        }
        if (textoProgresso) {
            textoProgresso.innerText = `${porcentagem}% Concluído`;
        }

        // Opcional: Salvar esse novo progresso no banco do usuário para persistir
        if (usuario.progressoCurso !== porcentagem) {
             atualizarProgressoNoServidor(usuario.nome, porcentagem);
        }

    } catch (erro) {
        console.error("Erro ao calcular progresso:", erro);
    }
}

// Função auxiliar para salvar o número atualizado no banco
async function atualizarProgressoNoServidor(nomeUsuario, novaPorcentagem) {
    await fetch('http://localhost:3000/usuario/atualizar-progresso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            usuario: nomeUsuario, 
            progressoCurso: novaPorcentagem 
        })
    });
}



window.iniciarPagamento = iniciarPagamento;

  async function iniciarPagamento() {
    try {
      const response = await fetch("http://localhost:3000/create-payment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "Plano Premium Plataforma",
          price: 29.9,
          email: "teste@email.com",
        }),
      });

      const data = await response.json();

      // Mostrar QR Code PIX
      document.getElementById("qrcode").src =
        "data:image/png;base64," + data.qr_code_base64;

      document.getElementById("pix").style.display = "block";
    } catch (err) {
      alert("Erro ao iniciar pagamento");
      console.error(err);
    }
  }
import {
    sortearTema,
    cadastrarTema,
    listarTemasProfessor
} from "./src/modulos/moduloTemas.js";

document.getElementById("btnSortearTema").addEventListener("click", sortearTema);
document.getElementById("btnCadastrarTema").addEventListener("click", cadastrarTema);

// Carrega a lista de temas se for professor
const perfil = localStorage.getItem("perfil"); // "professor" ou "aluno"
if (perfil === "professor") {
    listarTemasProfessor();
}
// Iniciar Aplicação
carregarDados();