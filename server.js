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
        const conteudo = await fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8');
        const bancoTotal = JSON.parse(conteudo.trim() || '[]');
        const temasDaDisciplina = bancoTotal
            .filter(q => q.disciplina.toLowerCase() === disciplina.toLowerCase())
            .map(q => q.tema);
        const temasUnicos = [...new Set(temasDaDisciplina)];
        res.json(temasUnicos);
    } catch (erro) {
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

// --- INICIALIZAÇÃO ---
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
    console.log(`📂 Questoes: ${CAMINHO_BANCO_QUESTOES}`);
    console.log(`📂 Redações: ${CAMINHO_BANCO_REDACOES}`);
    console.log(`📂 Matérias: ${CAMINHO_BANCO_MATERIAS}`);
});