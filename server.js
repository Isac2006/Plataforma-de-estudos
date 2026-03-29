import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import fsSync from 'fs';
import bcrypt from 'bcrypt';
import multer from 'multer';
import { pegarquestoesdobanco } from './src/modulos/pegararrayquestoes.js';

// 🔥 CRIAR __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔥 CRIAR APP PRIMEIRO
const app = express();
const porta = 3000;

// 🔥 CONFIGURAR UPLOADS
const PASTA_UPLOADS = path.join(__dirname, 'uploads');

if (!fsSync.existsSync(PASTA_UPLOADS)) {
    fsSync.mkdirSync(PASTA_UPLOADS, { recursive: true });
}

app.use('/uploads', express.static(PASTA_UPLOADS));

// 🔥 CONFIGURAR MULTER
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, PASTA_UPLOADS);
    },
    filename: function (req, file, cb) {
        const nomeUnico = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
        cb(null, nomeUnico);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) {
            cb(null, true);
        } else {
            cb(new Error("Apenas imagens são permitidas"));
        }
    }
});

// 🔥 ROTA DE UPLOAD
app.post('/upload-imagem', upload.single('imagem'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ erro: "Nenhuma imagem enviada" });
        }

        const urlImagem = `/uploads/${req.file.filename}`;

        res.json({
            mensagem: "Upload realizado com sucesso",
            url: urlImagem
        });

    } catch (erro) {
        console.error("Erro no upload:", erro);
        res.status(500).json({ erro: "Erro ao enviar imagem" });
    }
});

// --- CAMINHOS DOS BANCOS ---
const CAMINHO_BANCO_QUESTOES = path.join(__dirname, 'banco de dados provisorio', 'bancoquestoes.json');
const CAMINHO_BANCO_REDACOES = path.join(__dirname, 'banco de dados provisorio', 'redacao.json');
const CAMINHO_BANCO_MATERIAS = path.join(__dirname, 'banco de dados provisorio', 'bancomaterias.json');
const CAMINHO_BANCO_AULAS = path.join(__dirname, 'banco de dados provisorio', 'bancoaulas.json');
const CAMINHO_BANCO_USUARIOS = path.join(__dirname, 'banco de dados provisorio', 'usuarios.json');
const CAMINHO_BANCO_MODULOS = path.join(__dirname, 'banco de dados provisorio', 'bancomodulos.json');

app.use(cors()); 
app.use(express.json()); 
app.use(express.static(__dirname, { index: false }));

// ==========================================
//    FUNÇÕES AUXILIARES - LOGIN
// ==========================================

function validarEmail(email) {
    if (!email) return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

function validarCPF(cpf) {
    if (!cpf) return false;

    cpf = String(cpf).replace(/[^\d]+/g, '');

    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

    let soma = 0, resto;

    for (let i = 1; i <= 9; i++) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (11 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10), 10)) return false;

    soma = 0;
    for (let i = 1; i <= 10; i++) {
        soma += parseInt(cpf.substring(i - 1, i), 10) * (12 - i);
    }

    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;

    return resto === parseInt(cpf.substring(10, 11), 10);
}


// ==========================================
//    AUTH - REGISTRO
// ==========================================

app.post('/auth/registrar', async (req, res) => {
    let { nome, email, senha, cpf, tipo } = req.body;
    email = String(email).toLowerCase().trim();
    cpf = String(cpf).replace(/[^\d]+/g, '');
    // tipo = "aluno" ou "professor"

    if (!nome || !email || !senha || !cpf || !tipo) {
        return res.status(400).json({ erro: "Dados incompletos" });
    }

    if (!validarEmail(email)) {
        return res.status(400).json({ erro: "Email inválido" });
    }

    if (!validarCPF(cpf)) {
        return res.status(400).json({ erro: "CPF inválido" });
    }

    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        const usuarios = JSON.parse(conteudo || '[]');

        const existe = usuarios.find(
            u => u.email === email || u.cpf === cpf.replace(/[^\d]+/g, '')
        );

        if (existe) {
            return res.status(400).json({ erro: "Usuário já cadastrado" });
        }

        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = {
            id: Date.now(),
            nome,
            email,
            senha: senhaHash,
            cpf,
            tipo, // "aluno" ou "professor"
            criadoEm: new Date().toISOString()
        };

        console.log("CPF RECEBIDO:", cpf);
        console.log("CPF É VÁLIDO?", validarCPF(cpf));

        usuarios.push(novoUsuario);

        await fs.writeFile(
            CAMINHO_BANCO_USUARIOS,
            JSON.stringify(usuarios, null, 2)
        );

        res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.get("/modulos/:id", async (req, res) => {

    const id = Number(req.params.id);

    const conteudo = await fs.readFile(CAMINHO_BANCO_MODULOS, "utf-8");
    const banco = JSON.parse(conteudo || "[]");

    const materia = banco.find(m => m.id === id);

    if (!materia) {
        return res.status(404).json({ erro: "Não encontrada" });
    }

    res.json(materia);
});

// 🔹 POST – cadastrar matéria (NOVO MODELO COM SEÇÕES)
app.post('/materias', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, resumo, secoes } = req.body || {};

        if (!disciplina || !tema || !resumo || !Array.isArray(secoes) || secoes.length === 0) {
            return res.status(400).json({ mensagem: "Dados incompletos ou seções inválidas" });
        }

        // 🔥 Validação interna das seções
        const secoesValidadas = secoes
            .filter(s => s && s.titulo && s.conteudo)
            .map(s => ({
                titulo: String(s.titulo).trim(),
                conteudo: String(s.conteudo).trim()
            }));

        if (secoesValidadas.length === 0) {
            return res.status(400).json({ mensagem: "Nenhuma seção válida enviada" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8')
            .catch(() => '[]');

        let banco = [];

        try {
            banco = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            banco = [];
        }

        const novaMateria = {
            id: Date.now(),
            disciplina: normalizarTexto(disciplina),
            tema: normalizarTexto(tema),
            resumo: String(resumo).trim(),

            // 🔥 NOVA ESTRUTURA
            secoes: secoesValidadas,

            criadoEm: new Date().toISOString()
        };

        banco.push(novaMateria);

        await fs.writeFile(
            CAMINHO_BANCO_MATERIAS,
            JSON.stringify(banco, null, 2)
        );

        res.status(201).json({
            mensagem: "Matéria cadastrada com sucesso!",
            id: novaMateria.id
        });

    } catch (erro) {
        console.error("❌ Erro ao cadastrar matéria:", erro);
        res.status(500).json({ mensagem: "Erro interno ao salvar matéria" });
    }
});

// ==========================================
// 🔒 MIDDLEWARE - SOMENTE PROFESSOR
// ==========================================

async function apenasProfessor(req, res, next) {
    try {
        const { usuarioId } = req.body;

        if (!usuarioId) {
            return res.status(401).json({ erro: "Usuário não autenticado" });
        }

        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        const usuarios = JSON.parse(conteudo || '[]');

        const usuario = usuarios.find(u => String(u.id) === String(usuarioId));

        if (!usuario) {
            return res.status(401).json({ erro: "Usuário inválido" });
        }

        if (usuario.tipo !== "professor") {
            return res.status(403).json({ erro: "Apenas professores podem realizar essa ação" });
        }

        next();

    } catch (e) {
        console.error("Erro middleware professor:", e);
        res.status(500).json({ erro: "Erro interno" });
    }
}

// ==========================================
//    ROTAS DE REDAÇÕES (Nova Integração - BLINDADA)
// ==========================================

// 1. Aluno envia redação
app.post('/redacoes', async (req, res) => {
    try {
        const { usuario, titulo, conteudo_html, comentarios } = req.body || {};

        if (!usuario || !titulo || !conteudo_html) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            banco = [];
        }

        const novaRedacao = {
            id: Date.now(),
            usuario: String(usuario).toLowerCase().trim(), // 🔥 compatível com sua rota GET /redacoes/aluno
            titulo,
            conteudo_html,
            comentarios: Array.isArray(comentarios) ? comentarios : [], // 🔥 vem do front
            status: "pendente",
            data_envio: new Date().toISOString()
        };

        banco.push(novaRedacao);

        await fs.writeFile(CAMINHO_BANCO_REDACOES, JSON.stringify(banco, null, 2));

        res.status(201).json({ mensagem: "Enviado com sucesso!" });

    } catch (erro) {
        console.error("Erro ao salvar redação:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar no servidor" });
    }
});

// Aluno busca suas redações
app.get('/redacoes/aluno', async (req, res) => {
    try {
        const { nome } = req.query;
        if (!nome) return res.status(400).json({ mensagem: "Nome não informado" });

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            banco = [];
        }

        const aluno = String(nome).toLowerCase().trim();

        const minhasRedacoes = banco.filter(
            r => r && r.usuario && String(r.usuario).toLowerCase().trim() === aluno
        );

        res.json(minhasRedacoes);

    } catch (erro) {
        console.error("Erro ao buscar redações do aluno:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar" });
    }
});

// 2. Professor busca a mais antiga não corrigida (FILA)
app.get('/redacoes/proxima', async (req, res) => {
    try {
        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            banco = [];
        }

        const fila = banco
            .filter(r => r && r.status === "pendente" && r.data_envio)
            .sort((a, b) => new Date(a.data_envio) - new Date(b.data_envio));

        if (!fila.length) return res.status(404).json({ mensagem: "Fila vazia" });

        res.json(fila[0]);

    } catch (erro) {
        console.error("Erro ao buscar próxima redação:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar fila" });
    }
});

// 3. Professor envia redação corrigida
app.put('/redacoes/corrigir/:id', async (req, res) => {
    try {
        const idParaCorrigir = Number(req.params.id);
        if (!idParaCorrigir) {
            return res.status(400).json({ mensagem: "ID inválido" });
        }

        const { conteudo_html, comentarios } = req.body || {};

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_REDACOES, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            banco = [];
        }

        const index = banco.findIndex(r => r && r.id === idParaCorrigir);
        if (index === -1) return res.status(404).json({ mensagem: "Não encontrada" });

        banco[index] = {
            ...banco[index],
            conteudo_html: conteudo_html ?? banco[index].conteudo_html,
            comentarios: comentarios ?? banco[index].comentarios,
            status: "corrigida",
            data_correcao: new Date().toISOString()
        };

        await fs.writeFile(CAMINHO_BANCO_REDACOES, JSON.stringify(banco, null, 2));
        res.json({ mensagem: "Redação corrigida com sucesso!" });

    } catch (erro) {
        console.error("Erro ao salvar correção:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar correção" });
    }
});

// ==========================================
//        FUNÇÃO PADRÃO (NÃO REMOVE NADA)
// ==========================================
function normalizarTexto(txt) {
    const texto = String(txt || "").toLowerCase().trim();

    if (typeof texto.normalize === "function") {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }

    return texto;
}

// ==========================================
//        ROTAS DE MATÉRIAS
// ==========================================

// 🔹 GET – listar disciplinas únicas (para o select de matéria)
app.get('/materias', async (req, res) => {
    try {
        const conteudo = await fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8')
            .catch(() => '[]');

        let banco = [];

        try {
            banco = JSON.parse(conteudo.trim() || '[]');
        } catch {
            banco = [];
        }

        // 🔥 Ordenar mais recentes primeiro
        banco.sort((a, b) =>
            new Date(b.criadoEm || 0) - new Date(a.criadoEm || 0)
        );

        res.json(banco);

    } catch (erro) {
        console.error("Erro ao buscar matérias:", erro);
        res.status(500).json([]);
    }
});

app.get('/disciplinas', async (req, res) => {
    const conteudo = await fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8').catch(() => '[]');
    const banco = JSON.parse(conteudo || '[]');

    const disciplinasUnicas = [
        ...new Set(banco.map(m => m.disciplina))
    ];

    res.json(disciplinasUnicas);
});

app.get("/materias/:id", async (req, res) => {

    const id = Number(req.params.id);

    const conteudo = await fs.readFile(CAMINHO_BANCO_MATERIAS, "utf-8");
    const banco = JSON.parse(conteudo || "[]");

    const materia = banco.find(m => m.id === id);

    if (!materia) {
        return res.status(404).json({ erro: "Não encontrada" });
    }

    res.json(materia);
});

// ==========================================
//    ROTA ÚNICA /temas (QUESTÕES + AULAS)
// ==========================================
app.get('/temas', async (req, res) => {
    const { disciplina } = req.query;

    if (!disciplina) {
        return res.status(400).json({ mensagem: "Disciplina não informada" });
    }

    try {
        const [
            questoesRaw,
            aulasRaw,
            materiasRaw,
            modulosRaw
        ] = await Promise.all([
            fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_MODULOS, 'utf-8').catch(() => '[]')
        ]);

        const bancoQuestoes = JSON.parse(questoesRaw || '[]');
        const bancoAulas = JSON.parse(aulasRaw || '[]');
        const bancoMaterias = JSON.parse(materiasRaw || '[]');
        const bancoModulos = JSON.parse(modulosRaw || '[]');

        const disc = normalizarTexto(disciplina);

        const pegarTemas = (banco) =>
            banco
                .filter(item =>
                    item && normalizarTexto(item.disciplina) === disc
                )
                .map(item => normalizarTexto(item.tema));

        const temasUnicos = [
            ...new Set([
                ...pegarTemas(bancoQuestoes),
                ...pegarTemas(bancoAulas),
                ...pegarTemas(bancoMaterias),
                ...pegarTemas(bancoModulos)
            ])
        ];

        res.json(temasUnicos);

    } catch (erro) {
        console.error("Erro ao buscar temas:", erro);
        res.status(500).json([]);
    }
});

// ==========================================
//    ROTAS DE AULAS (Vídeos YouTube)
// ==========================================

// 1. Professor cadastra aula 
app.post('/aulas', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, url, url2 = "" } = req.body;

        if (!disciplina || !tema || !url) {
            return res.status(400).json({ mensagem: "Disciplina, tema e URL são obrigatórios" });
        }

        const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse(conteudo.trim() || '[]');
        } catch {
            banco = [];
        }

        const d = normalizarTexto(disciplina);
        const t = normalizarTexto(tema);

        const jaExiste = banco.find(a =>
            normalizarTexto(a.disciplina) === d &&
            normalizarTexto(a.tema) === t &&
            a.url === url
        );

        if (jaExiste) {
            return res.status(400).json({ mensagem: "Essa aula já foi cadastrada" });
        }

        const novaAula = {
    id: Date.now(),
    disciplina: d,
    tema: t,
    aula_url: url,
    aula_url_2: url2 || "",
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

app.get('/aulas/buscar', async (req, res) => {

try{

const disciplina = normalizarTexto(req.query.disciplina || "");
const tema = normalizarTexto(req.query.tema || "");

if(!disciplina || !tema){
return res.status(400).json({ mensagem:"Disciplina e tema obrigatórios"});
}

const conteudo = await fs.readFile(CAMINHO_BANCO_AULAS,'utf-8')
.catch(()=> "[]");

const banco = JSON.parse(conteudo || "[]");

const aula = banco.find(a=>{

const d = normalizarTexto(a.disciplina || "");
const t = normalizarTexto(a.tema || "");

return d === disciplina && t === tema;

});

if(!aula){
return res.json({
aula_url:"",
aula_url_2:""
});
}

res.json(aula);

}catch(erro){

console.error("Erro ao buscar aula:",erro);
res.status(500).json({ mensagem:"Erro no servidor"});

}

});

// ==========================================
//        ROTAS DE QUESTÕES
// ==========================================

// 🔹 POST – cadastrar questão
app.post('/questoes', apenasProfessor, async (req, res) => {
    try {
        const novaQuestao = {
    id: Date.now().toString(), // 🔥 ID OBRIGATÓRIO
    ...req.body
};


        if (
            !novaQuestao.disciplina ||
            !novaQuestao.tema ||
            !novaQuestao.enunciado ||
            !Array.isArray(novaQuestao.alternativas) ||
            !novaQuestao.resposta_correta
        ) {
            return res.status(400).json({ mensagem: "Dados incompletos da questão" });
        }

        // ✅ AJUSTE: garantir exatamente 4 alternativas
        if (novaQuestao.alternativas.length !== 4) {
            return res.status(400).json({ mensagem: "A questão deve ter 4 alternativas" });
        }

        const conteudo = await fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8').catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudo || '').trim() || '[]');
        } catch {
            banco = [];
        }

        banco.push(novaQuestao);

        await fs.writeFile(CAMINHO_BANCO_QUESTOES, JSON.stringify(banco, null, 2));

        console.log("✅ Questão salva no bancoquestoes.json");
        res.status(201).json({ mensagem: "Questão salva com sucesso!" });

    } catch (erro) {
        console.error("❌ Erro ao salvar questão:", erro);
        res.status(500).json({ mensagem: "Erro interno ao salvar questão" });
    }
});

// ==========================================
//    GET – Buscar questões por disciplina/tema
// ==========================================
app.get('/api/questoes', async (req, res) => {
    try {
        const { ids } = req.query;

        const conteudo = await fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8')
            .catch(() => '[]');

        let banco = [];
        try {
            banco = JSON.parse((conteudo || '').trim() || '[]');
        } catch {
            banco = [];
        }

        /* ===============================
           🔥 BUSCA POR IDS (MÓDULOS)
        =============================== */
        if (ids) {
            const listaIds = String(ids)
                .split(',')
                .map(id => id.trim());

            const filtradasPorId = banco.filter(q => {
                const idQuestao = String(q.id ?? q._id ?? q.questao_id ?? '');
                return listaIds.includes(idQuestao);
            });

            return res.json(filtradasPorId);
        }

        /* ===============================
           🔹 MODO ANTIGO (DISCIPLINA / TEMA)
        =============================== */
        const d = normalizarTexto(req.query.disciplina || '');
        const t = normalizarTexto(req.query.tema || '');

        let filtradas = banco.filter(q =>
            normalizarTexto(q.disciplina) === d
        );

        if (t) {
            filtradas = filtradas.filter(q =>
                normalizarTexto(q.tema) === t
            );
        }

        return res.json(filtradas);

    } catch (erro) {
        console.error('❌ Erro ao buscar questões:', erro);
        return res.status(500).json([]);
    }
});

// ==========================================
//    ROTAS DO CONSTRUTOR DE MÓDULOS
// ==========================================

app.get('/construtor/dados', async (req, res) => {
    const d = normalizarTexto(req.query.disciplina);
    const t = normalizarTexto(req.query.tema);

    if (!d || !t) {
        return res.status(400).json({ mensagem: "Disciplina e Tema são obrigatórios" });
    }

    try {
        const [aulasRaw, materiasRaw, questoesRaw] = await Promise.all([
            fs.readFile(CAMINHO_BANCO_AULAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_MATERIAS, 'utf-8').catch(() => '[]'),
            fs.readFile(CAMINHO_BANCO_QUESTOES, 'utf-8').catch(() => '[]')
        ]);

        let aulas = [];
        let materias = [];
        let questoes = [];

        try { aulas = JSON.parse(aulasRaw.trim() || '[]'); } catch {}
        try { materias = JSON.parse(materiasRaw.trim() || '[]'); } catch {}
        try { questoes = JSON.parse(questoesRaw.trim() || '[]'); } catch {}

        const aulaEncontrada = aulas.find(a =>
            normalizarTexto(a.disciplina) === d &&
            normalizarTexto(a.tema) === t
        );

        const materiaEncontrada = materias
            .filter(m =>
                normalizarTexto(m.disciplina) === d &&
                normalizarTexto(m.tema) === t
            )
            .at(-1);

        // 🔹 Filtra apenas as questões do módulo usando os IDs
        let questoesDisponiveis = [];

if (
    materiaEncontrada &&
    Array.isArray(materiaEncontrada.questoes_ids) &&
    materiaEncontrada.questoes_ids.length > 0
) {
    // 🔹 Garantia de comparação correta (Number x Number)
    const idsModulo = materiaEncontrada.questoes_ids.map(id => Number(id));

    questoesDisponiveis = questoes.filter(q =>
        idsModulo.includes(Number(q.id))
    );
} else {
    // 🔹 Fallback: todas as questões do tema
    questoesDisponiveis = questoes.filter(q =>
        normalizarTexto(q.disciplina) === d &&
        normalizarTexto(q.tema) === t
    );
}
console.log("Módulo:", materiaEncontrada?.tema);
console.log("IDs do módulo:", materiaEncontrada?.questoes_ids);
console.log("Questões encontradas:", questoesDisponiveis.length);

        res.json({
    aula: aulaEncontrada || null,
    resumo: materiaEncontrada ? materiaEncontrada.resumo || "" : "",
    secoes: materiaEncontrada ? materiaEncontrada.secoes || [] : [],
    questoes: questoesDisponiveis
    });
    
    } catch (erro) {
        console.error("Erro no Construtor:", erro);
        res.status(500).json({ mensagem: "Erro ao compilar dados" });
    }
});

// ==========================================
//    ROTA DE CRONOGRAMA (Salvamento JSON)
// ==========================================

app.post('/salvar', async (req, res) => {
    try {
        const { usuario, totalHoras, cronograma } = req.body;

        // 1. Validação de entrada
        if (!usuario) {
            return res.status(400).send("Usuário não identificado.");
        }

        // 2. Leitura segura do arquivo
        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];

        try {
            usuarios = JSON.parse(conteudo.trim() || '[]');
        } catch (e) {
            console.error("JSON de usuários corrompido, recriando arquivo:", e);
            usuarios = [];
        }

        // 3. Busca padronizada (evita duplicados por maiúscula/minúscula/espaços)
const chaveBusca = String(usuario).toLowerCase().trim();

const index = usuarios.findIndex(u => 
    (u.email && String(u.email).toLowerCase().trim() === chaveBusca) ||
    (u.nome && String(u.nome).toLowerCase().trim() === chaveBusca)
);

let usuarioEncontrado = usuarios[index];




        if (index !== -1) {
            // --- MODO ATUALIZAÇÃO ---
            // Spread vem primeiro para NÃO apagar dados do usuário
            usuarios[index] = {
                ...usuarios[index],
                totalHoras: Number.isFinite(+totalHoras)
                    ? +totalHoras
                    : (usuarios[index].totalHoras || 0),

                cronograma: Array.isArray(cronograma) && cronograma.length
                ? cronograma.filter(i => i && i.dia && i.hora && i.materia)
                : (usuarios[index].cronograma || []),

                ultimaAtualizacao: new Date().toISOString()
            };
        } else {
            // --- MODO CRIAÇÃO ---
            usuarios.push({
                id: Date.now(),
                nome: String(usuario).toLowerCase().trim(),
                email: "",
                aulasAssistidas: 0,
                redacoesFeitas: 0,
                modulosConcluidos: 0,
                questoesFeitas: 0,
                estatisticas: {
                    questoes: {
                        totalAcertos: 0,
                        totalErros: 0,
                        porMateria: {}
                    }
                },
                cronograma: Array.isArray(cronograma) && cronograma.length
                ? cronograma.filter(i => i && i.dia && i.hora && i.materia): [],
                totalHoras: Number.isFinite(+totalHoras) ? +totalHoras : 0,
                ultimaAtualizacao: new Date().toISOString()
            });
        }

        // 4. Gravação segura
        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));

        console.log(`✅ Cronograma de "${usuario}" salvo sem perder outros dados.`);
        res.status(200).send("Salvo com sucesso!");

    } catch (e) {
        console.error("❌ Erro na rota /salvar:", e);
        res.status(500).send("Erro interno ao salvar.");
    }
});

// ==========================================
//    ROTA ÚNICA PARA CRIAR OU ATUALIZAR MÓDULO
// ==========================================
app.post('/modulos/salvar', apenasProfessor, async (req, res) => {
    try {
        const {
            disciplina,
            tema,
            aula_url,
            aula_url_1,
            aula_url_2,
            resumo,
            questoes_ids
        } = req.body;

        if (!disciplina || !tema) {
            return res.status(400).json({ mensagem: "Disciplina e Tema são obrigatórios" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_MODULOS, 'utf-8').catch(() => '[]');
        let modulos = [];

        try {
            modulos = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            modulos = [];
        }

        const d = normalizarTexto(disciplina);
        const t = normalizarTexto(tema);

        const indexExistente = modulos.findIndex(m =>
            normalizarTexto(m.disciplina) === d &&
            normalizarTexto(m.tema) === t
        );

        const moduloAtualizado = {
            disciplina: d,
            tema: t,

            // aceita aula_url OU aula_url_1
            aula_url: aula_url || aula_url_1 || "",
            aula_url_2: aula_url_2 || "",

            resumo: resumo || "",
            questoes_ids: Array.isArray(questoes_ids) ? questoes_ids.map(String) : [],

            ultimaAtualizacao: new Date().toISOString()
        };

        if (indexExistente !== -1) {
            modulos[indexExistente] = {
                ...modulos[indexExistente],
                ...moduloAtualizado
            };

            await fs.writeFile(CAMINHO_BANCO_MODULOS, JSON.stringify(modulos, null, 2));
            return res.json({ mensagem: "Módulo atualizado com sucesso!" });
        }

        modulos.push({
            id: Date.now(),
            ...moduloAtualizado,
            criadoEm: new Date().toISOString()
        });

        await fs.writeFile(CAMINHO_BANCO_MODULOS, JSON.stringify(modulos, null, 2));
        res.json({ mensagem: "Módulo criado com sucesso!" });

    } catch (e) {
        console.error("❌ ERRO NA ROTA /modulos/salvar:", e);
        res.status(500).json({ mensagem: "Erro interno ao salvar módulo", detalhe: e.message });
    }
});

// ==========================================
//    GET – LISTAR MÓDULOS (POR MATÉRIA OPCIONAL)
// ==========================================
app.get('/modulos', async (req, res) => {
    try {
        const { disciplina } = req.query;

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_MODULOS, 'utf-8').catch(() => '[]');
        let modulos = [];

        try {
            modulos = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch {
            modulos = [];
        }

        if (disciplina) {
            const d = normalizarTexto(disciplina);
            modulos = modulos.filter(m => normalizarTexto(m.disciplina) === d);
        }

        // 🔥 GARANTIA DE DATA VÁLIDA
        modulos = modulos.map(m => ({
            ...m,
            criadoEm: m.criadoEm || m.ultimaAtualizacao || "1970-01-01T00:00:00.000Z"
        }));

        // 🔥 ORDENA DO MAIS NOVO PARA O MAIS ANTIGO
        modulos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

        res.json(modulos);

    } catch (e) {
        console.error("❌ Erro ao listar módulos:", e);
        res.status(500).json([]);
    }
});

// ==========================================
//    ROTA PARA REGISTRO AUTOMÁTICO (CHAMAR AO ESTUDAR)
// ==========================================

app.post('/registrar-estudo-agora', async (req, res) => {
    try {
        let { usuario, materia } = req.body;
        usuario = String(usuario).toLowerCase().trim();

        if (!usuario || !materia) {
            return res.status(400).json({ mensagem: "Usuário e Matéria são obrigatórios" });
        }

        const agora = new Date();
        const diasMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
        const diaAtual = diasMap[agora.getDay()];
        const horaAtual = String(agora.getHours()).padStart(2, '0') + ':00';

        // Leitura segura do banco
        const conteudo = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];

        try {
            usuarios = JSON.parse(conteudo.trim() || '[]');
        } catch (e) {
            console.error("JSON de usuários corrompido:", e);
            usuarios = [];
        }

        // Busca padronizada
        // 3. Busca padronizada (evita duplicados por maiúscula/minúscula/espaços)
const chaveBusca = String(usuario).toLowerCase().trim();

const index = usuarios.findIndex(u => 
    (u.email && String(u.email).toLowerCase().trim() === chaveBusca) ||
    (u.nome && String(u.nome).toLowerCase().trim() === chaveBusca)
);

let usuarioEncontrado = usuarios[index];

        if (index === -1) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        // Garante estrutura
        if (!usuarios[index].cronograma || !Array.isArray(usuarios[index].cronograma)) {
            usuarios[index].cronograma = [];
        }

        let encontrou = false;

        usuarios[index].cronograma = usuarios[index].cronograma.map(item => {
            if (item.dia === diaAtual && item.hora === horaAtual) {
                encontrou = true;
                return { 
                    ...item, 
                    materia: String(materia), 
                    status: "concluido" 
                };
            }
            return item;
        });

        if (!encontrou) {
            usuarios[index].cronograma.push({
                dia: diaAtual,
                hora: horaAtual,
                materia: String(materia),
                status: "concluido"
            });
        }

        // Atualiza timestamp (não quebra login, progresso, etc.)
        usuarios[index].ultimaAtualizacao = new Date().toISOString();

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

app.get('/usuario/dados', async (req, res) => {
    try {
        const { id, nome } = req.query;

        if ((!id || id === "undefined") && (!nome || nome === "undefined")) {
            return res.status(400).json({ mensagem: "Informe id ou nome" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];

        try {
            usuarios = JSON.parse(conteudoRaw.trim() || '[]');
        } catch {
            usuarios = [];
        }

        const chaveBusca = String(id || nome).toLowerCase().trim();

        let usuario = usuarios.find(u =>
            String(u.id) === chaveBusca ||
            (u.email && u.email.toLowerCase().trim() === chaveBusca) ||
            (u.nome && u.nome.toLowerCase().trim() === chaveBusca)
        );

        // 🧱 Se não existir, cria
        if (!usuario) {
            usuario = {
                id: Date.now(),
                nome: nome || "",
                email: "",
                cpf: "",
                tipo: "aluno",

                aulasAssistidas: 0,
                redacoesFeitas: 0,
                modulosConcluidos: 0,
                questoesFeitas: 0,

                estatisticas: { 
                    questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} } 
                },

                cronograma: [],
                criadoEm: new Date().toISOString(),
                ultimaAtualizacao: new Date().toISOString()
            };

            usuarios.push(usuario);
            await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        }

        // 🛡️ BLINDAGEM + GARANTIA DE ESTRUTURA PADRÃO
        usuario.aulasAssistidas = Number(usuario.aulasAssistidas) || 0;
        usuario.redacoesFeitas = Number(usuario.redacoesFeitas) || 0;
        usuario.modulosConcluidos = Number(usuario.modulosConcluidos) || 0;
        usuario.questoesFeitas = Number(usuario.questoesFeitas) || 0;

        if (!usuario.estatisticas) usuario.estatisticas = {};
        if (!usuario.estatisticas.questoes) {
            usuario.estatisticas.questoes = { totalAcertos: 0, totalErros: 0, porMateria: {} };
        }
        if (!usuario.estatisticas.questoes.porMateria) {
            usuario.estatisticas.questoes.porMateria = {};
        }

        // 🔥 NOVO: salva de volta no arquivo se o usuário já existia sem estrutura completa
        const indexUsuario = usuarios.findIndex(u => u.id === usuario.id);
        if (indexUsuario !== -1) {
            usuarios[indexUsuario] = usuario;
            await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        }

        res.json(usuario);

    } catch (e) {
        console.error("ERRO NA ROTA /usuario/dados:", e);
        res.status(500).json({ erro: e.message });
    }
});

// 2. Incrementar contadores simples (Aulas, Redações, Módulos)
app.post('/usuario/incrementar', async (req, res) => {
    try {
        const { usuario, campo } = req.body;
        if (!usuario || !campo) return res.status(400).json({ erro: "Dados incompletos" });

        const camposPermitidos = [
            "aulasAssistidas",
            "redacoesFeitas",
            "modulosConcluidos",
            "questoesFeitas"
        ];

        if (!camposPermitidos.includes(campo)) {
            return res.status(400).json({ erro: "Campo inválido para incremento" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];

        try {
            usuarios = JSON.parse(conteudoRaw.trim() || '[]');
        } catch (e) {
            console.error("Erro ao ler JSON de usuários, resetando arquivo.");
            usuarios = [];
        }

        const nomeBusca = String(usuario).toLowerCase().trim();
        const user = usuarios.find(u => 
        (u.nome && u.nome.toLowerCase().trim() === nomeBusca) ||
        (u.email && u.email.toLowerCase().trim() === nomeBusca)
        );


        if (!user) {
            return res.status(404).json({ erro: "Usuário não encontrado" });
        }

        user[campo] = (Number(user[campo]) || 0) + 1;
        user.ultimaAtualizacao = new Date().toISOString();

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
        const { usuario, disciplina, acertou, questao_id } = req.body;

        if (!usuario || !disciplina) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        const conteudoRaw = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf-8').catch(() => '[]');
        let usuarios = [];
        try {
            usuarios = JSON.parse((conteudoRaw || '').trim() || '[]');
        } catch (e) {
            console.error("JSON de usuários corrompido, resetando:", e);
            usuarios = [];
        }
        
        const chaveBusca = String(usuario).toLowerCase().trim();

        const index = usuarios.findIndex(u => 
        (u.nome && u.nome.toLowerCase().trim() === chaveBusca) ||
        (u.email && u.email.toLowerCase().trim() === chaveBusca)
        );

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

        const disc = String(disciplina).toLowerCase().trim();
        if (!user.estatisticas.questoes.porMateria[disc]) {
            user.estatisticas.questoes.porMateria[disc] = { acertos: 0, erros: 0 };
        }

        // --- LÓGICA DE INCREMENTO SEGURA ---
        const isCorrect = acertou === true || String(acertou) === 'true';

        if (isCorrect) {
            user.estatisticas.questoes.totalAcertos = (Number(user.estatisticas.questoes.totalAcertos) || 0) + 1;
            user.estatisticas.questoes.porMateria[disc].acertos = (Number(user.estatisticas.questoes.porMateria[disc].acertos) || 0) + 1;
        } else {
            user.estatisticas.questoes.totalErros = (Number(user.estatisticas.questoes.totalErros) || 0) + 1;
            user.estatisticas.questoes.porMateria[disc].erros = (Number(user.estatisticas.questoes.porMateria[disc].erros) || 0) + 1;
        }

        // Atualiza o contador global de questões feitas
        user.questoesFeitas = (Number(user.questoesFeitas) || 0) + 1;

        // --- (OPCIONAL) REGISTRA QUAIS QUESTÕES O USUÁRIO FEZ ---
        if (!Array.isArray(user.questoesRespondidas)) {
            user.questoesRespondidas = [];
        }
        if (questao_id) {
            user.questoesRespondidas.push(String(questao_id));
        }

        await fs.writeFile(CAMINHO_BANCO_USUARIOS, JSON.stringify(usuarios, null, 2));
        res.json({ sucesso: true });

    } catch (e) {
        console.error("ERRO DETALHADO NO REGISTRAR-RESPOSTA:", e); 
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: e.message });
    }
});


// =======================
// LOGIN (EMAIL OU CPF)
// =======================
app.post('/auth/login', async (req, res) => {
    try {
        const { login, senha } = req.body;

        if (!login || !senha) {
            return res.status(400).json({ erro: "Login e senha obrigatórios" });
        }

        const data = await fs.readFile(CAMINHO_BANCO_USUARIOS, 'utf8').catch(() => '[]');

        let usuarios = [];
        try {
            usuarios = JSON.parse((data || '').trim() || '[]');
        } catch {
            usuarios = [];
        }

        const loginNormalizado = String(login).toLowerCase().trim();
        const loginCPF = String(login).replace(/[^\d]+/g, '');

        const usuario = usuarios.find(u =>
            (u.email && u.email.toLowerCase().trim() === loginNormalizado) ||
            (u.cpf && String(u.cpf).replace(/[^\d]+/g, '') === loginCPF)
        );

        if (!usuario || !(await bcrypt.compare(senha, usuario.senha))) {
            return res.status(401).json({ erro: "Login ou senha inválidos" });
        }

        res.json({
            id: usuario.id,
            nome: usuario.nome,
            tipo: usuario.tipo
        });

    } catch (err) {
        console.error("ERRO LOGIN:", err);
        res.status(500).json({ erro: "Erro ao processar login" });
    }
});

const PASTA_BANCO = path.join(__dirname, 'banco de dados provisorio');

if (!fsSync.existsSync(PASTA_BANCO)) {
    fsSync.mkdirSync(PASTA_BANCO, { recursive: true });
}

async function garantirArquivo(caminho) {
    try {
        await fs.access(caminho);
    } catch {
        await fs.writeFile(caminho, '[]');
    }
}

await garantirArquivo(CAMINHO_BANCO_QUESTOES);
await garantirArquivo(CAMINHO_BANCO_REDACOES);
await garantirArquivo(CAMINHO_BANCO_MATERIAS);
await garantirArquivo(CAMINHO_BANCO_AULAS);
await garantirArquivo(CAMINHO_BANCO_USUARIOS);
await garantirArquivo(CAMINHO_BANCO_MODULOS);

// --- INICIALIZAÇÃO ---
app.get('/', (req, res) => {
    res.redirect('/inicial.html');
});

app.use((req, res) => {
    res.status(404).json({ erro: "Rota não encontrada" });
});

app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
    console.log(`📂 Questoes: ${CAMINHO_BANCO_QUESTOES}`);
    console.log(`📂 Redações: ${CAMINHO_BANCO_REDACOES}`);
    console.log(`📂 Matérias: ${CAMINHO_BANCO_MATERIAS}`);
    console.log(`📂 Aulas: ${CAMINHO_BANCO_AULAS}`); 
});