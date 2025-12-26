import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; 

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
        const { disciplina, tema, resumo, conteudoCompleto } = req.body;

        const novaMateria = {
            id: Date.now(),
            disciplina: String(disciplina).toLowerCase().trim(),
            tema: String(tema).toLowerCase().trim(),
            resumo,
            conteudoCompleto,
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
const CAMINHO_BANCO_USUARIOS = path.join(__dirname, 'banco de dados provisorio', 'usuarios.json');

app.post('/salvar', async (req, res) => {
    try {
        const dadosRecebidos = req.body; // { usuario: "Isac", cronograma: [...] }
        
        // 1. Lê o arquivo atual ou cria um array vazio se não existir
        let usuarios = [];
        try {
            const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8');
            usuarios = JSON.parse(conteudo || '[]');
        } catch (e) {
            usuarios = [];
        }

        // 2. Procura se o usuário já existe no array
        const index = usuarios.findIndex(u => u.nome.toLowerCase() === dadosRecebidos.usuario.toLowerCase());

        const dadosUsuario = {
            nome: dadosRecebidos.usuario,
            ultimaAtualizacao: new Date().toISOString(),
            totalHoras: dadosRecebidos.totalHoras,
            cronograma: dadosRecebidos.cronograma
        };

        if (index !== -1) {
            // Se existir, atualiza os dados dele
            usuarios[index] = dadosUsuario;
        } else {
            // Se não existir, adiciona um novo registro
            usuarios.push(dadosUsuario);
        }

        // 3. Salva o array completo de volta no arquivo único
        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        
        res.status(200).send(`Cronograma de ${dadosRecebidos.usuario} atualizado com sucesso no banco de dados!`);
    } catch (erro) {
        console.error("Erro ao salvar no banco de usuários:", erro);
        res.status(500).json({ mensagem: "Erro interno ao salvar." });
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

        // 1. Pega a hora e o dia exatos do servidor
        const agora = new Date();
        const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diaAtual = diasMap[agora.getDay()]; 
        const horaAtual = String(agora.getHours()).padStart(2, '0') + ':00';

        // 2. Lê o banco de dados de usuários
        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = JSON.parse(conteudo);

        // 3. Localiza o usuário
        const index = usuarios.findIndex(u => u.nome.toLowerCase() === usuario.toLowerCase());
        if (index === -1) return res.status(404).json({ mensagem: "Usuário não encontrado" });

        // 4. Atualiza ou Cria o registro no cronograma
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
                dia: diaAtual, hora: horaAtual, materia: materia, status: "concluido"
            });
        }

        // 5. Grava no arquivo
        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        
        res.json({ 
            mensagem: `Sucesso! Registrado: ${materia} em ${diaAtual} às ${horaAtual}`,
            dia: diaAtual,
            hora: horaAtual
        });

    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao registrar estudo" });
    }
});
// --- INICIALIZAÇÃO ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
    console.log(`📂 Questoes: ${CAMINHO_BANCO_QUESTOES}`);
    console.log(`📂 Redações: ${CAMINHO_BANCO_REDACOES}`);
    console.log(`📂 Matérias: ${CAMINHO_BANCO_MATERIAS}`);
    console.log(`📂 Aulas: ${CAMINHO_BANCO_AULAS}`); 
});