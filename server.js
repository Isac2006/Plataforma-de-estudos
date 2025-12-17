import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { pegarquestoesdobanco } from './src/modulos/pegararrayquestoes.js';

// Configuração para conseguir usar caminhos de arquivos com 'import'
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const porta = 3000;

// 2. Configurações básicas
app.use(cors()); 
app.use(express.json()); 

// 3. Servir arquivos estáticos (CSS, JS do navegador, Imagens)
// Isso faz com que o servidor consiga ler tudo o que está na sua pasta raiz e na 'src'
app.use(express.static(__dirname));
app.use('/src', express.static(path.join(__dirname, 'src')));

// 4. ROTA PRINCIPAL: Faz o site abrir ao acessar http://localhost:3000
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 5. Rota da API para pegar as questões
app.get('/questoes', (req, res) => {
    const { disciplina, tema } = req.query;

    console.log(`Pedido recebido: Disciplina: ${disciplina}, Tema: ${tema}`);

    try {
        const resultado = pegarquestoesdobanco(disciplina, tema);
        res.json(resultado);
    } catch (erro) {
        console.error("Erro ao ler o banco de dados:", erro);
        res.status(500).json({ mensagem: "Erro interno no servidor" });
    }
});

// 6. Liga o servidor
app.listen(porta, () => {
    console.log(`
    ✅ Servidor rodando com sucesso!
    📍 Página principal: http://localhost:${porta}
    🚀 Pronto para receber pedidos do seu HTML.
    `);
});