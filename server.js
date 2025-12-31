import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; 
import bcrypt from 'bcrypt';


import { pegarquestoesdobanco } from './src/modulos/pegararrayquestoes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const porta = 3000;

// --- CAMINHOS DOS BANCOS ---
const CAMINHO_BANCO_QUESTOES = path.join(__dirname, 'banco de dados provisorio', 'bancoquestoes.json');
const CAMINHO_BANCO_REDACOES = path.join(__dirname, 'banco de dados provisorio', 'redacao.json');
const CAMINHO_BANCO_MATERIAS = path.join(__dirname, 'banco de dados provisorio', 'bancomaterias.json');
const CAMINHO_BANCO_AULAS = path.join(__dirname, 'banco de dados provisorio', 'bancoaulas.json');
const CAMINHO_BANCO_USUARIOS = path.join(__dirname, 'banco de dados provisorio', 'usuarios.json');
const USERS_FILE = path.join(__dirname, 'banco de dados provisorio', 'usuarios.json');

app.use(cors()); 
app.use(express.json()); 
app.use(express.static(__dirname));

// ==========================================
//    ROTAS DE QUESTÕES (Sua lógica atual)
// ==========================================

app.get('/temas', async (req, res) => {
    const { disciplina } = req.query;
    if (!disciplina) return res.status(400).json({ mensagem: "Disciplina não informada" });

    try {
        // Busca temas nos dois bancos simultaneamente
        const [questoesRaw, aulasRaw] = await Promise.all([
            fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]')
        ]);

        const bancoQuestoes = JSON.parse(questoesRaw || '[]');
        const bancoAulas = JSON.parse(aulasRaw || '[]');

        const disc = disciplina.toLowerCase().trim();

        // Extrai temas de questões
        const temasQuestoes = bancoQuestoes
            .filter(q => q.disciplina.toLowerCase() === disc)
            .map(q => q.tema);

        // Extrai temas de aulas
        const temasAulas = bancoAulas
            .filter(a => a.disciplina.toLowerCase() === disc)
            .map(a => a.tema);

        // Une os dois e remove duplicados
        const temasUnicos = [...new Set([...temasQuestoes, ...temasAulas])];
        
        res.json(temasUnicos);
    } catch (erro) {
        console.error("Erro ao buscar temas unificados:", erro);
        res.status(500).json([]);
    }
});

app.get('/questoes', async (req, res) => {
    const { disciplina, tema } = req.query;
    try {
        const resultado = await pegarquestoesdobanco(disciplina, tema);
        res.json(resultado);
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro interno" });
    }
});

app.post('/questoes', async (req, res) => {
    try {
        const novaQuestao = req.body;
        const conteudo = await fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8');
        const bancoTotal = JSON.parse(conteudo.trim() || '[]');
        const questaoFormatada = {
            id: Date.now(),
            ...novaQuestao,
            disciplina: String(novaQuestao.disciplina).toLowerCase().trim(),
            tema: String(novaQuestao.tema).toLowerCase().trim()
        };
        bancoTotal.push(questaoFormatada);
        await fs.writeFile(CAMINHO_BANCO_QUESTOES, JSON.stringify(bancoTotal, null, 2));
        res.status(201).json(questaoFormatada);
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao gravar" });
    }
});

// ==========================================
//    ROTAS DE REDAÇÕES (Nova Integração)
// ==========================================

// 1. Aluno envia redação
app.post('/redacoes', async (req, res) => {
    try {
        const { usuario, titulo, conteudo_html } = req.body;
        
        const conteudo = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');
        const banco = JSON.parse(conteudo || '[]');

        const novaRedacao = {
            id: Date.now(),
            usuario: usuario, // Aqui o nome do aluno é gravado no banco
            titulo: titulo,
            conteudo_html: conteudo_html,
            comentarios: [],
            status: "pendente",
            data_envio: new Date().toISOString()
        };

        banco.push(novaRedacao);
        await fs.writeFile(CAMINHO_BANCO_REDACOES, JSON.stringify(banco, null, 2));
        res.status(201).json({ mensagem: "Enviado com sucesso!" });
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao salvar no servidor" });
    }
});
app.get('/redacoes/aluno', async (req, res) => {
    try {
        const { nome } = req.query;
        const conteudo = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');
        const banco = JSON.parse(conteudo);

        // Filtra todas as redações daquele aluno
        const minhasRedacoes = banco.filter(r => r.usuario.toLowerCase() === nome.toLowerCase());

        res.json(minhasRedacoes);
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao buscar" });
    }
});

// 2. Professor busca a mais antiga não corrigida (FILA)
app.get('/redacoes/proxima', async (req, res) => {
    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');
        const banco = JSON.parse(conteudo || '[]');

        // Filtra apenas pendentes e ordena por data (mais antiga primeiro)
        const fila = banco
            .filter(r => r.status === "pendente")
            .sort((a, b) => new Date(a.data_envio) - new Date(b.data_envio));

        if (fila.length === 0) return res.status(404).json({ mensagem: "Fila vazia" });

        res.json(fila[0]);
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao buscar fila" });
    }
});

// 3. Professor envia redação corrigida
app.put('/redacoes/corrigir/:id', async (req, res) => {
    try {
        const idParaCorrigir = parseInt(req.params.id);
        const { conteudo_html, comentarios } = req.body;

        const conteudo = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8');
        let banco = JSON.parse(conteudo);

        const index = banco.findIndex(r => r.id === idParaCorrigir);
        if (index === -1) return res.status(404).json({ mensagem: "Não encontrada" });

        // Atualiza para corrigida
        banco[index] = {
            ...banco[index],
            conteudo_html,
            comentarios,
            status: "corrigida",
            data_correcao: new Date().toISOString()
        };

        await fs.writeFile(CAMINHO_BANCO_REDACOES, JSON.stringify(banco, null, 2));
        res.json({ mensagem: "Redação corrigida com sucesso!" });
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao salvar correção" });
    }
});

// ==========================================
//    ROTAS DE MATÉRIAS (Nova Integração)
// ==========================================

app.post('/materias', async (req, res) => {
    try {
        const { disciplina, tema, resumo, conteudoCompleto, imagens } = req.body;

        const novaMateria = {
            id: Date.now(),
            disciplina: String(disciplina).toLowerCase().trim(),
            tema: String(tema).toLowerCase().trim(),
            resumo,
            conteudoCompleto,
            imagens: Array.isArray(imagens) ? imagens : [],
            dataCriacao: new Date().toISOString()
        };

        const conteudo = await fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8')
            .catch(() => '[]');

        const banco = JSON.parse(conteudo || '[]');
        banco.push(novaMateria);

        await fs.writeFile(
            CAMINHO_BANCO_MATERIAS,
            JSON.stringify(banco, null, 2)
        );

        res.status(201).json({ mensagem: "Matéria cadastrada com sucesso!" });
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao salvar matéria" });
    }
});
// ==========================================
//    ROTAS DE AULAS (Vídeos YouTube)
// ==========================================


// 1. Professor cadastra aula 
app.post('/aulas', async (req, res) => {
    try {
        // Agora aceitamos url2 vindo do body
        const { disciplina, tema, url, url2 } = req.body;

        const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]');
        const banco = JSON.parse(conteudo || '[]');

        const novaAula = {
            id: Date.now(),
            disciplina: String(disciplina).toLowerCase().trim(),
            tema: String(tema).toLowerCase().trim(),
            url: url, 
            url2: url2 || "", // NOVO: Salva a segunda URL se ela existir
            data_cadastro: new Date().toISOString()
        };

        banco.push(novaAula);
        await fs.writeFile(CAMINHO_BANCO_AULAS, JSON.stringify(banco, null, 2));
        res.status(201).json({ mensagem: "Aula salva com sucesso!" });
    } catch (erro) {
        console.error("Erro ao salvar aula:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar aula no servidor" });
    }
});

// 2. Aluno busca temas disponíveis (Para preencher o Select Dinâmico)
app.get('/aulas/temas', async (req, res) => {
    const { disciplina } = req.query;
    if (!disciplina) return res.json([]); // Retorna vazio se não escolher a matéria

    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]');
        const aulas = JSON.parse(conteudo);
        
        // Filtra os temas pela disciplina selecionada
        const temasFiltrados = aulas
            .filter(a => a.disciplina === disciplina.toLowerCase().trim())
            .map(a => a.tema);
            
        // Remove temas duplicados
        const temasUnicos = [...new Set(temasFiltrados)];
        res.json(temasUnicos);
    } catch (erro) {
        res.status(500).json([]);
    }
});

// 3. Aluno busca a aula específica após selecionar Disciplina e Tema
app.get('/aulas/buscar', async (req, res) => {
    try {
        const { disciplina, tema } = req.query;
        const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]');
        const banco = JSON.parse(conteudo || '[]');

        const aula = banco.find(a => 
            a.disciplina === disciplina.toLowerCase().trim() && 
            a.tema === tema.toLowerCase().trim()
        );

        if (!aula) return res.status(404).json({ mensagem: "Aula não encontrada" });

        res.json(aula);
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao buscar aula" });
    }
});

// ==========================================
//    ROTAS DO CONSTRUTOR DE MÓDULOS
// ==========================================

const CAMINHO_BANCO_MODULOS = path.join(__dirname, 'banco de dados provisorio', 'modulos_completos.json');

// 1. Busca TUDO que existe sobre um tema para o montador
app.get('/construtor/dados', async (req, res) => {
    const { disciplina, tema } = req.query;
    if (!disciplina || !tema) return res.status(400).json({ mensagem: "Disciplina e Tema são obrigatórios" });

    try {
        const [aulasRaw, materiasRaw, questoesRaw] = await Promise.all([
            fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8').catch(() => '[]')
        ]);

        const d = disciplina.toLowerCase().trim();
        const t = tema.toLowerCase().trim();

        const aulas = JSON.parse(aulasRaw || '[]');
        const materias = JSON.parse(materiasRaw || '[]');
        const questoes = JSON.parse(questoesRaw || '[]');

        const aulaEncontrada = aulas.find(a => a.disciplina === d && a.tema === t);
        const materiaEncontrada = materias.find(m => m.disciplina === d && m.tema === t);
        const questoesDisponiveis = questoes.filter(q => q.disciplina === d && q.tema === t);

        res.json({
            aula: aulaEncontrada || null,
            // Prioriza o resumo da matéria, se não houver, manda vazio
            resumo: materiaEncontrada ? (materiaEncontrada.resumo || materiaEncontrada.conteudoCompleto || "") : "",
            questoes: questoesDisponiveis
        });
    } catch (erro) {
        console.error("Erro no Construtor:", erro);
        res.status(500).json({ mensagem: "Erro ao compilar dados" });
    }
});

// 2. Salva a estrutura do módulo
app.post('/modulos/salvar', async (req, res) => {
    try {
        const { disciplina, tema, aula_url, aula_url_2, resumo, questoes_ids } = req.body; 
        
        let banco = [];
        try {
            const conteudo = await fs.readFile(CAMINHO_BANCO_MODULOS, 'utf-8');
            banco = JSON.parse(conteudo);
        } catch (e) {
            banco = [];
        }

        const moduloEstruturado = {
            id: Date.now(),
            disciplina: disciplina,
            tema: tema,
            aula_url: aula_url,
            aula_url_2: aula_url_2 || "", // NOVO: Armazena o segundo vídeo
            resumo: resumo,
            questoes_ids: questoes_ids,
            data_criacao: new Date().toISOString()
        };

        banco.push(moduloEstruturado);
        
        await fs.writeFile(CAMINHO_BANCO_MODULOS, JSON.stringify(banco, null, 2));
        
        res.status(201).json({ mensagem: "Módulo estruturado com sucesso!", id: moduloEstruturado.id });
    } catch (erro) {
        console.error("Erro ao salvar módulo:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar estrutura no servidor" });
    }
});
app.get('/modulos/visualizar', async (req, res) => {
    const { disciplina, tema } = req.query;
    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_MODULOS, 'utf-8').catch(() => '[]');
        const modulos = JSON.parse(conteudo);

        const moduloEncontrado = modulos.find(m => 
            m.disciplina.toLowerCase() === disciplina.toLowerCase() && 
            m.tema.toLowerCase() === tema.toLowerCase()
        );

        if (!moduloEncontrado) {
            return res.status(404).json({ mensagem: "Módulo ainda não construído pelo professor." });
        }

        const questoesRaw = await fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8');
        const todasQuestoes = JSON.parse(questoesRaw);

        const detalhesQuestoes = todasQuestoes.filter(q => 
            moduloEncontrado.questoes_ids.includes(String(q.id))
        );

        // O moduloEncontrado agora contém aula_url e aula_url_2
        res.json({
            ...moduloEncontrado,
            questoes_completas: detalhesQuestoes
        });
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao carregar módulo" });
    }
});
// ==========================================
//    ROTA DE CRONOGRAMA (Salvamento JSON)
// ==========================================

// Defina o caminho do banco de usuários no topo com os outros caminhos

app.post('/salvar', async (req, res) => {
    try {
        const { usuario, totalHoras, cronograma } = req.body;
        
        // 1. Validação de entrada
        if (!usuario) return res.status(400).send("Usuário não identificado.");

        // 2. Leitura segura do arquivo
        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];
        try {
            usuarios = JSON.parse(conteudo.trim() || '[]');
        } catch (e) {
            usuarios = [];
        }

        // 3. Busca padronizada (evita criar duplicados por causa de letra maiúscula)
        const nomeBusca = usuario.toLowerCase().trim();
        const index = usuarios.findIndex(u => u.nome && u.nome.toLowerCase().trim() === nomeBusca);

        if (index !== -1) {
            // --- MODO ATUALIZAÇÃO ---
            // O spread (...usuarios[index]) DEVE vir primeiro para não perder 
            // aulasAssistidas, estatisticas, questoesFeitas, etc.
            usuarios[index] = {
                ...usuarios[index], 
                totalHoras: totalHoras || usuarios[index].totalHoras || 0,
                cronograma: cronograma || usuarios[index].cronograma || [],
                ultimaAtualizacao: new Date().toISOString()
            };
        } else {
            // --- MODO CRIAÇÃO ---
            // Aqui adicionamos TODOS os campos que o sistema usa, para evitar 'undefined' no futuro
            usuarios.push({
                nome: usuario,
                email: "", // Preenchido no registro, mas garantido aqui
                aulasAssistidas: 0,
                redacoesFeitas: 0,
                modulosConcluidos: 0,
                questoesFeitas: 0,
                estatisticas: { 
                    questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} } 
                },
                cronograma: cronograma || [],
                totalHoras: totalHoras || 0,
                ultimaAtualizacao: new Date().toISOString()
            });
        }

        // 4. Gravação segura
        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        
        console.log(`✅ Cronograma de ${usuario} salvo sem perdas de outros dados.`);
        res.status(200).send("Salvo com sucesso!");

    } catch (e) {
        console.error("❌ Erro na rota /salvar:", e);
        res.status(500).send("Erro interno ao salvar.");
    }
});
// ==========================================
//    ROTA PARA REGISTRO AUTOMÁTICO (CHAMAR AO ESTUDAR)
// ==========================================

app.post('/registrar-estudo-agora', async (req, res) => {
    try {
        const { usuario, materia } = req.body;
        
        if (!usuario || !materia) {
            return res.status(400).json({ mensagem: "Usuário e Matéria são obrigatórios" });
        }

        const agora = new Date();
        const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diaAtual = diasMap[agora.getDay()]; 
        const horaAtual = String(agora.getHours()).padStart(2, '0') + ':00';

        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = JSON.parse(conteudo.trim() || '[]');

        const index = usuarios.findIndex(u => u.nome && u.nome.toLowerCase() === usuario.toLowerCase());
        if (index === -1) return res.status(404).json({ mensagem: "Usuário não encontrado" });

        // --- CORREÇÃO AQUI: Garante que o cronograma existe antes de usar o .map ---
        if (!usuarios[index].cronograma || !Array.isArray(usuarios[index].cronograma)) {
            usuarios[index].cronograma = [];
        }

        let encontrou = false;
        usuarios[index].cronograma = usuarios[index].cronograma.map(item => {
            if (item.dia === diaAtual && item.hora === horaAtual) {
                encontrou = true;
                return { ...item, materia: materia, status: "concluido" };
            }
            return item;
        });

        if (!encontrou) {
            usuarios[index].cronograma.push({
                dia: diaAtual, 
                hora: horaAtual, 
                materia: materia, 
                status: "concluido"
            });
        }

        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        
        res.json({ 
            mensagem: `Sucesso! Registrado: ${materia}`,
            dia: diaAtual,
            hora: horaAtual
        });

    } catch (erro) {
        console.error("ERRO NO CRONOGRAMA:", erro);
        res.status(500).json({ mensagem: "Erro ao registrar estudo", detalhe: erro.message });
    }
});




// ==========================================
//    ROTAS DE ESTATÍSTICAS E DESEMPENHO
// ==========================================

// 1. Buscar dados completos do usuário (Estatísticas, Redações, etc)
app.get('/usuario/dados', async (req, res) => {
    try {
        const { nome } = req.query;
        if (!nome || nome === "undefined") return res.status(400).json({ mensagem: "Nome inválido" });

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];
        try {
            usuarios = JSON.parse(conteudoRaw.trim() || '[]');
        } catch (e) { usuarios = []; }

        let usuario = usuarios.find(u => u.nome && u.nome.toLowerCase() === nome.toLowerCase());

        if (!usuario) {
            usuario = {
                nome: nome,
                aulasAssistidas: 0,
                redacoesFeitas: 0,
                modulosConcluidos: 0,
                questoesFeitas: 0, // Garanta que este campo exista
                estatisticas: { 
                    questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} } 
                },
                cronograma: [],
                ultimaAtualizacao: new Date().toISOString()
            };
            usuarios.push(usuario);
            await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        }
        
        res.json(usuario);
    } catch (e) {
        res.status(500).json({ erro: e.message });
    }
});
// 2. Incrementar contadores simples (Aulas, Redações, Módulos)
app.post('/usuario/incrementar', async (req, res) => {
    try {
        const { usuario, campo } = req.body;
        if (!usuario || !campo) return res.status(400).json({ erro: "Dados incompletos" });

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        
        let usuarios = [];
        try {
            // O .trim() remove espaços que quebram o JSON.parse
            usuarios = JSON.parse(conteudoRaw.trim() || '[]');
        } catch (e) {
            console.error("Erro ao ler JSON de usuários, resetando arquivo.");
            usuarios = [];
        }
        
        const user = usuarios.find(u => u.nome && u.nome.toLowerCase() === usuario.toLowerCase());
        
        if (!user) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        user[campo] = (Number(user[campo]) || 0) + 1;

        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        res.json({ sucesso: true, novoValor: user[campo] });

    } catch (e) {
        console.error("ERRO NO INCREMENTAR:", e); 
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

// 3. Registrar respostas de questões (Acertos/Erros por Matéria)
app.post('/usuario/registrar-resposta', async (req, res) => {
    try {
        const { usuario, disciplina, acertou } = req.body;

        if (!usuario || !disciplina) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];
        try {
            usuarios = JSON.parse(conteudoRaw.trim() || '[]');
        } catch (e) {
            usuarios = [];
        }
        
        const index = usuarios.findIndex(u => u.nome && u.nome.toLowerCase() === usuario.toLowerCase());
        if (index === -1) return res.status(404).json({ mensagem: "Usuário não encontrado" });

        let user = usuarios[index];

        // --- BLINDAGEM DA ESTRUTURA (Evita Erro 500) ---
        if (!user.estatisticas) user.estatisticas = {};
        if (!user.estatisticas.questoes) {
            user.estatisticas.questoes = { totalAcertos: 0, totalErros: 0, porMateria: {} };
        }
        if (!user.estatisticas.questoes.porMateria) {
            user.estatisticas.questoes.porMateria = {};
        }

        const disc = disciplina.toLowerCase().trim();
        if (!user.estatisticas.questoes.porMateria[disc]) {
            user.estatisticas.questoes.porMateria[disc] = { acertos: 0, erros: 0 };
        }

        // --- LÓGICA DE INCREMENTO SEGURA ---
        const isCorrect = String(acertou) === 'true';

        if (isCorrect) {
            user.estatisticas.questoes.totalAcertos = (Number(user.estatisticas.questoes.totalAcertos) || 0) + 1;
            user.estatisticas.questoes.porMateria[disc].acertos = (Number(user.estatisticas.questoes.porMateria[disc].acertos) || 0) + 1;
        } else {
            user.estatisticas.questoes.totalErros = (Number(user.estatisticas.questoes.totalErros) || 0) + 1;
            user.estatisticas.questoes.porMateria[disc].erros = (Number(user.estatisticas.questoes.porMateria[disc].erros) || 0) + 1;
        }

        // Atualiza o contador global de questões feitas
        user.questoesFeitas = (Number(user.questoesFeitas) || 0) + 1;

        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        res.json({ sucesso: true });

    } catch (e) {
        console.error("ERRO DETALHADO NO REGISTRAR-RESPOSTA:", e); 
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: e.message });
    }
});



// ==========================================
//    ROTA DE login
// ==========================================


// Função para validar CPF (Algoritmo Real)
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i-1, i)) * (11 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    if (resto != parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i-1, i)) * (12 - i);
    resto = (soma * 10) % 11;
    if ((resto == 10) || (resto == 11)) resto = 0;
    return (resto == parseInt(cpf.substring(10, 11)));
}

// Função para validar Email
function validarEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.post('/auth/registrar', async (req, res) => {
    const { usuario, senha, email, cpf, nascimento, faculdade, curso } = req.body;

    if (!validarEmail(email)) return res.status(400).json({ erro: "Email inválido!" });
    if (!validarCPF(cpf)) return res.status(400).json({ erro: "CPF inválido!" });

    try {
        // Usa o caminho unificado
        const data = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf8').catch(() => '[]');
        const usuarios = JSON.parse(data || '[]');

        if (usuarios.find(u => u.cpf === cpf || u.email === email)) {
            return res.status(400).json({ erro: "CPF ou Email já cadastrado!" });
        }

        const hashSenha = await bcrypt.hash(senha, 10);

        const novoUsuario = {
            nome: usuario,
            senha: hashSenha,
            email,
            cpf: cpf.replace(/[^\d]+/g, ''),
            nascimento,
            faculdade,
            curso,
            // Mantém a estrutura de estatísticas que suas outras rotas esperam
            aulasAssistidas: 0,
            redacoesFeitas: 0,
            modulosConcluidos: 0,
            estatisticas: { questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} } },
            cronograma: []
        };

        usuarios.push(novoUsuario);
        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        res.status(201).json({ mensagem: "Conta criada com sucesso!" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ erro: "Erro interno no servidor." });
    }
});

// Rota de Login (Simplificada para o exemplo)
app.post('/auth/login', async (req, res) => {
    const { email, senha } = req.body;
    try {
        const data = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf8').catch(() => '[]');
        const usuarios = JSON.parse(data || '[]');

        const user = usuarios.find(u => u.email === email);
        
        if (user && await bcrypt.compare(senha, user.senha)) {
            // Retorna o nome para o localStorage do Front-end
            res.json({ mensagem: "Sucesso", usuario: user.nome });
        } else {
            res.status(401).json({ erro: "E-mail ou senha incorretos." });
        }
    } catch (e) {
        res.status(500).json({ erro: "Erro ao processar login." });
    }
});
// ==========================================
//    ROTA DE gerenciamento usuarios (Admin)
// ==========================================
// Rota para buscar todos os usuários
app.get('/api/usuarios', async (req, res) => {
    try {
        console.log("Lendo arquivo de usuários em:", USERS_FILE); 
        
        // Em fs/promises, usamos readFile com await. 
        // O .catch(() => '[]') garante que se o arquivo não existir, retorna array vazio.
        const data = await fs.readFile(USERS_FILE, 'utf8').catch(() => '[]');
        
        const json = JSON.parse(data || '[]');
        res.json(json);

    } catch (err) {
        console.error("❌ ERRO NO SERVIDOR:", err); 
        res.status(500).send("Erro interno ao processar usuários");
    }
});

// Rota para salvar alterações
// Adicionamos 'async' aqui também
app.post('/api/usuarios', async (req, res) => {
    try {
        const novosUsuarios = req.body;
        // Usamos await fs.writeFile em vez de writeFileSync
        await fs.writeFile(USERS_FILE, JSON.stringify(novosUsuarios, null, 2));
        res.status(200).send({ message: "Dados salvos com sucesso!" });
    } catch (err) {
        console.error("Erro ao salvar usuários:", err);
        res.status(500).send({ error: "Erro ao gravar dados." });
    }
});
// Adicione no seu server.js (seção de Rotas de Aulas)

app.get('/api/total-aulas', async (req, res) => {
    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]');
        const aulas = JSON.parse(conteudo || '[]');
        
        // Retorna a quantidade total de aulas cadastradas
        res.json({ total: aulas.length });
    } catch (erro) {
        res.status(500).json({ total: 0 });
    }
});
// server.js - Rota para atualizar apenas o progresso
app.post('/usuario/atualizar-progresso', async (req, res) => {
    try {
        const { usuario, progressoCurso } = req.body;
        
        const data = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf8');
        let usuarios = JSON.parse(data);
        
        const index = usuarios.findIndex(u => u.nome.toLowerCase() === usuario.toLowerCase());
        
        if (index !== -1) {
            usuarios[index].progressoCurso = progressoCurso;
            await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
            res.json({ sucesso: true });
        } else {
            res.status(404).json({ erro: "Usuário não encontrado" });
        }
    } catch (e) {
        res.status(500).json({ erro: "Erro ao salvar progresso" });
    }
});
// Rota para registrar progresso dinâmico baseado no total de aulas




// --- INICIALIZAÇÃO ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
    console.log(`📂 Questoes: ${CAMINHO_BANCO_QUESTOES}`);
    console.log(`📂 Redações: ${CAMINHO_BANCO_REDACOES}`);
    console.log(`📂 Matérias: ${CAMINHO_BANCO_MATERIAS}`);
    console.log(`📂 Aulas: ${CAMINHO_BANCO_AULAS}`); 
});