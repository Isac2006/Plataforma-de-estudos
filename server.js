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

// Nome do banco atualizado para bancoquestoes.json
const CAMINHO_BANCO = path.join(__dirname, 'banco de dados provisorio', 'bancoquestoes.json');

app.use(cors()); 
app.use(express.json()); 

app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. ROTA DE BUSCA (GET)
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

// 3. ROTA DE GRAVAÇÃO (POST) - TOTALMENTE CONCERTADA
app.post('/questoes', async (req, res) => {
    try {
        const novaQuestao = req.body;

        // Validação básica
        if (!novaQuestao.enunciado || !novaQuestao.alternativas) {
            return res.status(400).json({ erro: "Dados incompletos no formulário" });
        }

        let bancoTotal = [];

        try {
            // Tenta ler o arquivo
            const conteudo = await fs.readFile(CAMINHO_BANCO, 'utf-8');
            // Se o arquivo existir mas estiver vazio, JSON.parse falha, então usamos || '[]'
            bancoTotal = JSON.parse(conteudo.trim() || '[]');
        } catch (lerErro) {
            // Se o arquivo não existir, começamos com array vazio
            console.log("Aviso: Criando novo array de questões (arquivo não existia ou estava vazio).");
            bancoTotal = [];
        }

        // Formatação da nova questão
        const questaoFormatada = {
            id: Date.now(),
            disciplina: String(novaQuestao.disciplina || 'geral').toLowerCase().trim(),
            tema: String(novaQuestao.tema || 'geral').toLowerCase().trim(),
            enunciado: novaQuestao.enunciado,
            alternativas: novaQuestao.alternativas,
            resposta_correta: novaQuestao.resposta_correta
        };

        bancoTotal.push(questaoFormatada);

        // Salvar com indentação para ficar legível
        await fs.writeFile(CAMINHO_BANCO, JSON.stringify(bancoTotal, null, 2), 'utf-8');

        console.log("✅ Nova questão salva com sucesso!");
        res.status(201).json({ mensagem: "Questão gravada com sucesso!", questao: questaoFormatada });

    } catch (erro) {
        // Log detalhado no seu terminal do VS Code
        console.error("❌ ERRO NO SERVIDOR:", erro.message);
        res.status(500).json({ mensagem: "Erro ao gravar no banco de dados", detalhe: erro.message });
    }
});

app.listen(porta, () => {
    console.log(`
    ✅ Servidor rodando com sucesso!
    📍 Página principal: http://localhost:${porta}
    🚀 Banco de dados: ${CAMINHO_BANCO}
    `);
});