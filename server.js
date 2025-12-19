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

const CAMINHO_BANCO = path.join(__dirname, 'banco de dados provisorio', 'bancoquestoes.json');

app.use(cors()); 
app.use(express.json()); 
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// --- NOVA ROTA: BUSCAR TEMAS DINÂMICOS ---
app.get('/temas', async (req, res) => {
    const { disciplina } = req.query;

    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO, 'utf-8');
        const bancoTotal = JSON.parse(conteudo.trim() || '[]');

        // 1. Filtra as questões pela disciplina selecionada
        const temasDaDisciplina = bancoTotal
            .filter(q => q.disciplina === disciplina.toLowerCase())
            .map(q => q.tema);

        // 2. Remove duplicados (ex: se tiver 10 questões de "algebra", retorna apenas um "algebra")
        const temasUnicos = [...new Set(temasDaDisciplina)];

        res.json(temasUnicos);
    } catch (erro) {
        console.error("❌ Erro ao buscar temas:", erro);
        res.status(500).json([]);
    }
});
// ----------------------------------------

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/questoes', (req, res) => {
    const { disciplina, tema } = req.query;
    console.log(`🔍 Busca: Disciplina: ${disciplina}, Tema: ${tema}`);
    try {
        const resultado = pegarquestoesdobanco(disciplina, tema);
        res.json(resultado);
    } catch (erro) {
        console.error("❌ Erro ao ler banco:", erro);
        res.status(500).json({ mensagem: "Erro interno ao buscar questões" });
    }
});

app.post('/questoes', async (req, res) => {
    try {
        const novaQuestao = req.body;
        if (!novaQuestao.enunciado || !novaQuestao.alternativas) {
            return res.status(400).json({ erro: "Dados incompletos no formulário" });
        }

        let bancoTotal = [];
        try {
            const conteudo = await fs.readFile(CAMINHO_BANCO, 'utf-8');
            bancoTotal = JSON.parse(conteudo.trim() || '[]');
        } catch (lerErro) {
            bancoTotal = [];
        }

        const questaoFormatada = {
            id: Date.now(),
            disciplina: String(novaQuestao.disciplina || 'geral').toLowerCase().trim(),
            tema: String(novaQuestao.tema || 'geral').toLowerCase().trim(),
            enunciado: novaQuestao.enunciado,
            alternativas: novaQuestao.alternativas,
            resposta_correta: novaQuestao.resposta_correta
        };

        bancoTotal.push(questaoFormatada);
        await fs.writeFile(CAMINHO_BANCO, JSON.stringify(bancoTotal, null, 2), 'utf-8');

        res.status(201).json({ mensagem: "Questão gravada!", questao: questaoFormatada });
    } catch (erro) {
        res.status(500).json({ mensagem: "Erro ao gravar", detalhe: erro.message });
    }
});

app.listen(porta, () => {
    console.log(`✅ Servidor rodando em http://localhost:${porta}`);
});