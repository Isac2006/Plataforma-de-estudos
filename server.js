import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises'; 

// Importa a função do seu módulo de banco de dados
import { pegarquestoesdobanco } from './src/modulos/pegararrayquestoes.js';

// Configuração de caminhos para ES Modules no Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const porta = 3000;

// Caminho absoluto para o arquivo JSON de questões
const CAMINHO_BANCO = path.join(__dirname, 'banco de dados provisorio', 'bancoquestoes.json');

// --- MIDDLEWARES ---
app.use(cors()); 
app.use(express.json()); 

// Serve os arquivos da raiz. 
// Isso permite que o index.html acesse /src/script.js corretamente.
app.use(express.static(__dirname)); 

// --- ROTA: BUSCAR TEMAS DINÂMICOS ---
app.get('/temas', async (req, res) => {
    const { disciplina } = req.query;

    if (!disciplina) {
        return res.status(400).json({ mensagem: "Disciplina não informada" });
    }

    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO, 'utf-8');
        const bancoTotal = JSON.parse(conteudo.trim() || '[]');

        // Filtra os temas daquela disciplina e remove duplicados
        const temasDaDisciplina = bancoTotal
            .filter(q => q.disciplina.toLowerCase() === disciplina.toLowerCase())
            .map(q => q.tema);

        const temasUnicos = [...new Set(temasDaDisciplina)];
        res.json(temasUnicos);
    } catch (erro) {
        console.error("❌ Erro ao buscar temas:", erro);
        res.status(500).json([]);
    }
});

// --- ROTA: PÁGINA INICIAL ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- ROTA: BUSCAR QUESTÕES ---
app.get('/questoes', async (req, res) => {
    const { disciplina, tema } = req.query;
    console.log(`🔍 Requisição recebida - Disciplina: ${disciplina}, Tema: ${tema}`);
    
    try {
        const resultado = await pegarquestoesdobanco(disciplina, tema);
        res.json(resultado);
    } catch (erro) {
        console.error("❌ Erro ao processar questões:", erro);
        res.status(500).json({ mensagem: "Erro interno ao buscar questões" });
    }
});

// --- ROTA: CADASTRAR NOVA QUESTÃO ---
app.post('/questoes', async (req, res) => {
    try {
        const novaQuestao = req.body;
        
        if (!novaQuestao.enunciado || !novaQuestao.alternativas || !novaQuestao.resposta_correta) {
            return res.status(400).json({ mensagem: "Dados incompletos no formulário" });
        }

        const conteudo = await fs.readFile(CAMINHO_BANCO, 'utf-8');
        const bancoTotal = JSON.parse(conteudo.trim() || '[]');

        const questaoFormatada = {
            id: Date.now(),
            disciplina: String(novaQuestao.disciplina).toLowerCase().trim(),
            tema: String(novaQuestao.tema).toLowerCase().trim(),
            enunciado: novaQuestao.enunciado,
            alternativas: novaQuestao.alternativas,
            resposta_correta: novaQuestao.resposta_correta
        };

        bancoTotal.push(questaoFormatada);

        await fs.writeFile(CAMINHO_BANCO, JSON.stringify(bancoTotal, null, 2), 'utf-8');

        console.log("✅ Nova questão cadastrada com sucesso!");
        res.status(201).json({ mensagem: "Questão gravada com sucesso!", questao: questaoFormatada });
    } catch (erro) {
        console.error("❌ Erro ao gravar nova questão:", erro);
        res.status(500).json({ mensagem: "Erro ao gravar no banco de dados" });
    }
});

// Inicialização do servidor
app.listen(porta, () => {
    console.log(`
    🚀 Servidor pronto!
    📡 Rodando em: http://localhost:${porta}
    📂 Banco de dados: ${CAMINHO_BANCO}
    `);
});