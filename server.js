import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import fsSync from 'fs';
import bcrypt from 'bcrypt';
import multer from 'multer';
import db from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const porta = 3000;

// ==========================================
//    UPLOADS
// ==========================================

const PASTA_UPLOADS = path.join(__dirname, 'uploads');

if (!fsSync.existsSync(PASTA_UPLOADS)) {
    fsSync.mkdirSync(PASTA_UPLOADS, { recursive: true });
}

app.use('/uploads', express.static(PASTA_UPLOADS));

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, PASTA_UPLOADS),
    filename: (req, file, cb) => {
        const nomeUnico = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
        cb(null, nomeUnico);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith("image/")) cb(null, true);
        else cb(new Error("Apenas imagens são permitidas"));
    }
});

app.post('/upload-imagem', upload.single('imagem'), (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ erro: "Nenhuma imagem enviada" });
        res.json({ mensagem: "Upload realizado com sucesso", url: `/uploads/${req.file.filename}` });
    } catch (erro) {
        console.error("Erro no upload:", erro);
        res.status(500).json({ erro: "Erro ao enviar imagem" });
    }
});

app.use(cors());
app.use(express.json());

// ==========================================
//    FUNÇÕES AUXILIARES
// ==========================================

function normalizarTexto(txt) {
    const texto = String(txt || "").toLowerCase().trim();
    if (typeof texto.normalize === "function") {
        return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return texto;
}

function safeJSONParse(data, fallback = []) {
    if (!data) return fallback;
    if (typeof data === "object") return data;
    if (typeof data !== "string") return fallback;
    try {
        return JSON.parse(data);
    } catch (e) {
        console.warn("⚠️ JSON inválido:", data);
        return fallback;
    }
}

// ==========================================
//    MIDDLEWARE - SOMENTE PROFESSOR
//    Usado em: POST, PUT, DELETE de conteúdo
//    Aceita usuarioId via body ou query
// ==========================================

async function apenasProfessor(req, res, next) {
    try {
        const usuarioId = req.body?.usuarioId || req.query?.usuarioId;

        if (!usuarioId) return res.status(401).json({ erro: "Usuário não autenticado" });

        const [rows] = await db.execute(
            `SELECT tipo FROM usuarios WHERE id = ?`,
            [usuarioId]
        );

        if (rows.length === 0) return res.status(401).json({ erro: "Usuário inválido" });

        if (rows[0].tipo !== "professor") {
            return res.status(403).json({ erro: "Apenas professores podem realizar essa ação" });
        }

        next();
    } catch (e) {
        console.error("Erro middleware professor:", e);
        res.status(500).json({ erro: "Erro interno" });
    }
}

// ==========================================
//    MIDDLEWARE - PROFESSOR OU PAGANTE
//    Usado em: GET de conteúdo protegido
//    Aceita usuarioId via body ou query
// ==========================================

async function apenasAutorizado(req, res, next) {
    try {
        const usuarioId = req.body?.usuarioId || req.query?.usuarioId;

        if (!usuarioId) return res.status(401).json({ erro: "Usuário não autenticado" });

        const [rows] = await db.execute(
            `SELECT tipo, pago FROM usuarios WHERE id = ?`,
            [usuarioId]
        );

        if (rows.length === 0) return res.status(401).json({ erro: "Usuário inválido" });

        const { tipo, pago } = rows[0];

        if (tipo === "professor" || pago == 1) {
            return next();
        }

        return res.status(403).json({ erro: "Acesso restrito a professores ou assinantes" });

    } catch (e) {
        console.error("Erro middleware autorizado:", e);
        res.status(500).json({ erro: "Erro interno" });
    }
}

// ==========================================
//    AUTH - REGISTRO
// ==========================================

app.post('/auth/registrar', async (req, res) => {
    let { nome, email, senha, cpf, tipo } = req.body;

    email = String(email).toLowerCase().trim();
    cpf = String(cpf).replace(/[^\d]+/g, '');

    if (!nome || !email || !senha || !cpf || !tipo) {
        return res.status(400).json({ erro: "Dados incompletos" });
    }

    try {
        const [existe] = await db.execute(
            `SELECT id FROM usuarios WHERE email = ? OR cpf = ?`,
            [email, cpf]
        );

        if (existe.length > 0) return res.status(400).json({ erro: "Usuário já cadastrado" });

        const senhaHash = await bcrypt.hash(senha, 10);

        const estatisticasPadrao = {
            questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} }
        };

        await db.execute(
            `INSERT INTO usuarios 
            (nome, email, senha, cpf, tipo, aulasAssistidas, redacoesFeitas, modulosConcluidos, questoesFeitas, estatisticas, ultimaAtualizacao)
            VALUES (?, ?, ?, ?, ?, 0, 0, 0, 0, ?, NOW())`,
            [nome, email, senhaHash, cpf, tipo, JSON.stringify(estatisticasPadrao)]
        );

        res.status(201).json({ mensagem: "Cadastro realizado com sucesso!" });

    } catch (erro) {
        console.error("ERRO REGISTRO:", erro);
        res.status(500).json({ erro: "Erro no servidor" });
    }
});

// ==========================================
//    AUTH - LOGIN
// ==========================================

app.post('/auth/login', async (req, res) => {
    try {
        const { login, senha } = req.body;

        if (!login || !senha) return res.status(400).json({ erro: "Login e senha obrigatórios" });

        const loginNormalizado = String(login).toLowerCase().trim();
        const loginCPF = String(login).replace(/[^\d]+/g, '');

        const [usuarios] = await db.execute(
            `SELECT * FROM usuarios WHERE email = ? OR cpf = ?`,
            [loginNormalizado, loginCPF]
        );

        if (usuarios.length === 0) return res.status(401).json({ erro: "Login ou senha inválidos" });

        const usuario = usuarios[0];
        const senhaValida = await bcrypt.compare(senha, usuario.senha);

        if (!senhaValida) return res.status(401).json({ erro: "Login ou senha inválidos" });

        // Retorna pago e tipo para o frontend controlar acesso
        res.json({ id: usuario.id, nome: usuario.nome, tipo: usuario.tipo, pago: usuario.pago });

    } catch (err) {
        console.error("ERRO LOGIN:", err);
        res.status(500).json({ erro: "Erro ao processar login" });
    }
});

// ==========================================
//    ROTAS DE REDAÇÕES
// ==========================================

app.post('/redacoes', async (req, res) => {
    try {
        const { usuario, titulo, conteudo_html, comentarios } = req.body || {};

        if (!usuario || !titulo || !conteudo_html) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        const id = Date.now();

        await db.execute(
            `INSERT INTO redacoes 
            (id, usuario, titulo, conteudo_html, status, data_envio, comentarios)
            VALUES (?, ?, ?, ?, 'pendente', NOW(), ?)`,
            [
                id,
                String(usuario).toLowerCase().trim(),
                titulo,
                conteudo_html,
                JSON.stringify(Array.isArray(comentarios) ? comentarios : [])
            ]
        );

        res.status(201).json({ mensagem: "Enviado com sucesso!" });

    } catch (erro) {
        console.error("Erro ao salvar redação:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar no servidor" });
    }
});

app.get('/redacoes/aluno', async (req, res) => {
    try {
        const { nome } = req.query;
        if (!nome) return res.status(400).json({ mensagem: "Nome não informado" });

        const [rows] = await db.execute(
            `SELECT * FROM redacoes WHERE LOWER(usuario) = LOWER(?) ORDER BY data_envio DESC`,
            [String(nome).toLowerCase().trim()]
        );

        res.json(rows);

    } catch (erro) {
        console.error("Erro ao buscar redações:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar" });
    }
});

app.get('/redacoes/proxima', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT * FROM redacoes
            WHERE LOWER(TRIM(status)) = 'pendente'
            ORDER BY data_envio ASC
            LIMIT 1
        `);

        res.json(rows.length ? rows[0] : null);

    } catch (erro) {
        console.error("Erro ao buscar próxima redação:", erro);
        res.status(500).json({ mensagem: "Erro ao buscar fila" });
    }
});

app.put('/redacoes/corrigir/:id', async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { conteudo_html, comentarios } = req.body;

        await db.execute(
            `UPDATE redacoes 
             SET conteudo_html = ?, comentarios = ?, status = 'corrigida', data_correcao = NOW()
             WHERE id = ?`,
            [conteudo_html, JSON.stringify(comentarios || []), id]
        );

        res.json({ mensagem: "Redação corrigida com sucesso!" });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ mensagem: "Erro ao corrigir" });
    }
});

app.get('/redacao/temas/aleatorio', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT * FROM temas_redacao ORDER BY RAND() LIMIT 1');
        if (!rows.length) return res.status(404).json({ mensagem: 'Nenhum tema cadastrado.' });
        res.json(rows[0]);
    } catch (e) {
        res.status(500).json({ mensagem: 'Erro ao buscar tema.' });
    }
});

app.post('/redacao/temas', async (req, res) => {
    const { tema, texto1, texto2, texto3, imagem1, imagem2 } = req.body;
    if (!tema || !texto1) return res.status(400).json({ mensagem: 'Tema e Texto 1 são obrigatórios.' });
    try {
        await db.query(
            'INSERT INTO temas_redacao (tema, texto1, texto2, texto3, imagem1, imagem2) VALUES (?, ?, ?, ?, ?, ?)',
            [tema, texto1, texto2 || null, texto3 || null, imagem1 || null, imagem2 || null]
        );
        res.status(201).json({ mensagem: 'Tema cadastrado com sucesso!' });
    } catch (e) {
        res.status(500).json({ mensagem: 'Erro ao cadastrar tema.' });
    }
});

app.delete('/redacao/temas/:id', async (req, res) => {
    try {
        await db.query('DELETE FROM temas_redacao WHERE id = ?', [req.params.id]);
        res.json({ mensagem: 'Tema removido.' });
    } catch (e) {
        res.status(500).json({ mensagem: 'Erro ao remover tema.' });
    }
});

app.get('/redacao/temas', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT id, tema, criado_em FROM temas_redacao ORDER BY criado_em DESC');
        res.json(rows);
    } catch (e) {
        res.status(500).json({ mensagem: 'Erro ao listar temas.' });
    }
});

// ==========================================
//    ROTAS DE MATÉRIAS
//    GET → livre
//    POST → somente professor
// ==========================================

app.get('/materias', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM materias ORDER BY criado_em DESC`);
        const materias = rows.map(m => ({ ...m, secoes: safeJSONParse(m.secoes, []) }));
        res.json(materias);
    } catch (erro) {
        console.error("Erro ao buscar matérias:", erro);
        res.status(500).json({ erro: "Erro ao buscar matérias" });
    }
});

app.get('/materias/:id', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM materias WHERE id = ?`, [Number(req.params.id)]);
        if (!rows.length) return res.status(404).json({ mensagem: "Não encontrada" });
        const materia = { ...rows[0], secoes: safeJSONParse(rows[0].secoes, []) };
        res.json(materia);
    } catch (erro) {
        console.error(erro);
        res.status(500).json({ mensagem: "Erro ao buscar matéria" });
    }
});

// POST → somente professor
app.post('/materias', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, resumo, secoes } = req.body;

        if (!disciplina || !tema || !resumo || !Array.isArray(secoes) || secoes.length === 0) {
            return res.status(400).json({ mensagem: "Dados incompletos ou inválidos" });
        }

        const secoesValidadas = secoes
            .filter(s => s && s.titulo && s.conteudo)
            .map(s => ({ titulo: String(s.titulo).trim(), conteudo: String(s.conteudo).trim() }));

        if (secoesValidadas.length === 0) {
            return res.status(400).json({ mensagem: "Nenhuma seção válida" });
        }

        await db.execute(
            `INSERT INTO materias (disciplina, tema, resumo, secoes) VALUES (?, ?, ?, ?)`,
            [disciplina.toLowerCase().trim(), tema.toLowerCase().trim(), resumo.trim(), JSON.stringify(secoesValidadas)]
        );

        res.status(201).json({ mensagem: "Matéria cadastrada!" });

    } catch (erro) {
        console.error("Erro ao salvar matéria:", erro);
        res.status(500).json({ mensagem: "Erro no servidor", detalhe: erro.sqlMessage || erro.message });
    }
});

app.get('/disciplinas', async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT DISTINCT disciplina FROM materias ORDER BY disciplina ASC`);
        res.json(rows.map(r => r.disciplina).filter(Boolean));
    } catch (erro) {
        console.error(erro);
        res.status(500).json([]);
    }
});

// ==========================================
//    ROTA /temas
//    GET → professor ou pagante
//    Frontend: GET /temas?disciplina=X&usuarioId=ID
// ==========================================

app.get('/temas', apenasAutorizado, async (req, res) => {
    const { disciplina } = req.query;

    if (!disciplina) return res.status(400).json({ mensagem: "Disciplina não informada" });

    try {
        const disc = normalizarTexto(disciplina);

        const [questoesRows, aulasRows, materiasRows, modulosRows] = await Promise.all([
            db.execute(`SELECT tema FROM questoes WHERE LOWER(disciplina) = ?`, [disc]),
            db.execute(`SELECT tema FROM aulas WHERE LOWER(disciplina) = ?`, [disc]),
            db.execute(`SELECT tema FROM materias WHERE LOWER(disciplina) = ?`, [disc]),
            db.execute(`SELECT tema FROM modulos WHERE LOWER(disciplina) = ?`, [disc])
        ]);

        const pegarTemas = ([rows]) => rows.map(r => normalizarTexto(r.tema));

        const temasUnicos = [
            ...new Set([
                ...pegarTemas(questoesRows),
                ...pegarTemas(aulasRows),
                ...pegarTemas(materiasRows),
                ...pegarTemas(modulosRows)
            ])
        ];

        res.json(temasUnicos);

    } catch (erro) {
        console.error("Erro ao buscar temas:", erro);
        res.status(500).json([]);
    }
});

// ==========================================
//    ROTAS DE AULAS
//    GET  → professor ou pagante
//    POST → somente professor
//    Frontend GET: /aulas/buscar?disciplina=X&tema=Y&usuarioId=ID
// ==========================================

// POST → somente professor
app.post('/aulas', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, url, url2 = "" } = req.body;

        if (!disciplina || !tema || !url) {
            return res.status(400).json({ mensagem: "Disciplina, tema e URL são obrigatórios" });
        }

        const d = normalizarTexto(disciplina);
        const t = normalizarTexto(tema);

        const [existe] = await db.execute(
            `SELECT id FROM aulas WHERE disciplina = ? AND tema = ? AND aula_url = ?`,
            [d, t, url]
        );

        if (existe.length > 0) return res.status(400).json({ mensagem: "Essa aula já foi cadastrada" });

        await db.execute(
            `INSERT INTO aulas (disciplina, tema, aula_url, aula_url_2, data_cadastro) VALUES (?, ?, ?, ?, NOW())`,
            [d, t, url, url2]
        );

        res.status(201).json({ mensagem: "Aula salva com sucesso!" });

    } catch (erro) {
        console.error("Erro ao salvar aula:", erro);
        res.status(500).json({ mensagem: "Erro ao salvar aula no servidor" });
    }
});

// GET → professor ou pagante
app.get('/aulas/buscar', apenasAutorizado, async (req, res) => {
    try {
        const disciplina = normalizarTexto(req.query.disciplina || "");
        const tema = normalizarTexto(req.query.tema || "");

        if (!disciplina || !tema) {
            return res.status(400).json({ mensagem: "Disciplina e tema obrigatórios" });
        }

        const [result] = await db.execute(
            `SELECT * FROM aulas WHERE LOWER(disciplina) = LOWER(?) AND LOWER(tema) = LOWER(?) LIMIT 1`,
            [disciplina, tema]
        );

        res.json(result.length ? result[0] : { aula_url: "", aula_url_2: "" });

    } catch (erro) {
        console.error("Erro ao buscar aula:", erro);
        res.status(500).json({ mensagem: "Erro no servidor" });
    }
});

// ==========================================
//    ROTAS DE QUESTÕES
//    GET    → professor ou pagante
//    POST   → somente professor
//    PUT    → somente professor
//    DELETE → somente professor
//    Frontend GET: /api/questoes?disciplina=X&tema=Y&usuarioId=ID
// ==========================================

// POST → somente professor
app.post('/questoes', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, enunciado, alternativas, resposta_correta, imagem, explicacao } = req.body;

        if (!disciplina || !tema || !enunciado || !Array.isArray(alternativas) || !resposta_correta) {
            return res.status(400).json({ mensagem: "Dados incompletos da questão" });
        }

        if (alternativas.length !== 4) {
            return res.status(400).json({ mensagem: "A questão deve ter 4 alternativas" });
        }

        await db.execute(
            `INSERT INTO questoes (disciplina, tema, enunciado, alternativas, resposta_correta, imagem, explicacao, criado_em)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                normalizarTexto(disciplina),
                normalizarTexto(tema),
                enunciado,
                JSON.stringify(alternativas),
                resposta_correta,
                imagem || null,
                explicacao || null
            ]
        );

        res.status(201).json({ mensagem: "Questão salva com sucesso!" });

    } catch (erro) {
        console.error("❌ Erro ao salvar questão:", erro);
        res.status(500).json({ mensagem: "Erro interno ao salvar questão" });
    }
});

// GET → professor ou pagante
app.get('/api/questoes', apenasAutorizado, async (req, res) => {
    try {
        const { ids, disciplina, tema } = req.query;

        if (ids) {
            const listaIds = String(ids).split(',').map(id => id.trim()).filter(Boolean);
            if (listaIds.length === 0) return res.json([]);

            const placeholders = listaIds.map(() => '?').join(',');
            const [rows] = await db.execute(
                `SELECT * FROM questoes WHERE id IN (${placeholders})`,
                listaIds
            );

            return res.json(rows.map(q => ({ ...q, alternativas: safeJSONParse(q.alternativas, []) })));
        }

        const d = normalizarTexto(disciplina || '');
        const t = normalizarTexto(tema || '');

        if (!d) return res.json([]);

        let query = `SELECT * FROM questoes WHERE LOWER(disciplina) = ?`;
        const params = [d];

        if (t) {
            query += ` AND LOWER(tema) = ?`;
            params.push(t);
        }

        const [rows] = await db.execute(query, params);

        return res.json(rows.map(q => ({ ...q, alternativas: safeJSONParse(q.alternativas, []) })));

    } catch (erro) {
        console.error('❌ Erro ao buscar questões:', erro);
        return res.status(500).json([]);
    }
});

// PUT → somente professor
app.put('/questoes/:id', apenasProfessor, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const { enunciado, alternativas, resposta_correta } = req.body;

        if (!enunciado || !Array.isArray(alternativas) || !resposta_correta) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        if (alternativas.length !== 4) {
            return res.status(400).json({ mensagem: "A questão deve ter 4 alternativas" });
        }

        const [result] = await db.execute(
            `UPDATE questoes SET enunciado = ?, alternativas = ?, resposta_correta = ? WHERE id = ?`,
            [enunciado, JSON.stringify(alternativas), resposta_correta, id]
        );

        if (result.affectedRows === 0) return res.status(404).json({ mensagem: "Questão não encontrada" });

        res.json({ mensagem: "Questão atualizada com sucesso!" });

    } catch (erro) {
        console.error("❌ Erro ao editar questão:", erro);
        res.status(500).json({ mensagem: "Erro interno ao editar questão" });
    }
});

// DELETE → somente professor
app.delete('/questoes/:id', apenasProfessor, async (req, res) => {
    try {
        const id = Number(req.params.id);

        const [result] = await db.execute(`DELETE FROM questoes WHERE id = ?`, [id]);

        if (result.affectedRows === 0) return res.status(404).json({ mensagem: "Questão não encontrada" });

        res.json({ mensagem: "Questão apagada com sucesso!" });

    } catch (erro) {
        console.error("❌ Erro ao apagar questão:", erro);
        res.status(500).json({ mensagem: "Erro interno ao apagar questão" });
    }
});

// ==========================================
//    CONSTRUTOR DE MÓDULOS
//    GET → professor ou pagante
//    Frontend: /construtor/dados?disciplina=X&tema=Y&usuarioId=ID
// ==========================================

app.get('/construtor/dados', apenasAutorizado, async (req, res) => {
    const d = normalizarTexto(req.query.disciplina);
    const t = normalizarTexto(req.query.tema);

    if (!d || !t) return res.status(400).json({ mensagem: "Disciplina e Tema são obrigatórios" });

    try {
        const [[aulas], [materias], modulo] = await Promise.all([
            db.execute(`SELECT * FROM aulas WHERE LOWER(disciplina) = ? AND LOWER(tema) = ? LIMIT 1`, [d, t]),
            db.execute(`SELECT * FROM materias WHERE LOWER(disciplina) = ? AND LOWER(tema) = ? ORDER BY criado_em DESC LIMIT 1`, [d, t]),
            db.execute(`SELECT * FROM modulos WHERE LOWER(disciplina) = ? AND LOWER(tema) = ? LIMIT 1`, [d, t])
        ]);

        const aulaEncontrada = aulas[0] || null;
        const materiaEncontrada = materias[0] || null;
        const moduloEncontrado = modulo[0]?.[0] || null;

        let questoesDisponiveis = [];

        if (moduloEncontrado) {
            const questoes_ids = safeJSONParse(moduloEncontrado.questoes_ids, []);

            if (questoes_ids.length > 0) {
                const placeholders = questoes_ids.map(() => '?').join(',');
                const [questoesRows] = await db.execute(
                    `SELECT * FROM questoes WHERE id IN (${placeholders})`,
                    questoes_ids.map(Number)
                );
                questoesDisponiveis = questoesRows.map(q => ({ ...q, alternativas: safeJSONParse(q.alternativas, []) }));
            }
        }

        if (questoesDisponiveis.length === 0) {
            const [fallbackRows] = await db.execute(
                `SELECT * FROM questoes WHERE LOWER(disciplina) = ? AND LOWER(tema) = ?`,
                [d, t]
            );
            questoesDisponiveis = fallbackRows.map(q => ({ ...q, alternativas: safeJSONParse(q.alternativas, []) }));
        }

        res.json({
            aula: aulaEncontrada,
            resumo: materiaEncontrada?.resumo || "",
            secoes: safeJSONParse(materiaEncontrada?.secoes, []),
            questoes: questoesDisponiveis
        });

    } catch (erro) {
        console.error("Erro no Construtor:", erro);
        res.status(500).json({ mensagem: "Erro ao compilar dados" });
    }
});

// ==========================================
//    ROTAS DE MÓDULOS
//    GET  → professor ou pagante
//    POST → somente professor
//    Frontend GET: /modulos?usuarioId=ID ou /modulos/:id?usuarioId=ID
// ==========================================

// POST → somente professor
app.post('/modulos/salvar', apenasProfessor, async (req, res) => {
    try {
        const { disciplina, tema, aula_url, aula_url_1, aula_url_2, resumo, questoes_ids } = req.body;

        if (!disciplina || !tema) {
            return res.status(400).json({ mensagem: "Disciplina e Tema são obrigatórios" });
        }

        const d = normalizarTexto(disciplina);
        const t = normalizarTexto(tema);

        const urlFinal = aula_url || aula_url_1 || "";
        const url2Final = aula_url_2 || "";
        const questoesIdsJSON = JSON.stringify(Array.isArray(questoes_ids) ? questoes_ids.map(String) : []);
        const resumoFinal = resumo || "";

        const [existe] = await db.execute(
            `SELECT id FROM modulos WHERE LOWER(disciplina) = ? AND LOWER(tema) = ?`,
            [d, t]
        );

        if (existe.length > 0) {
            await db.execute(
                `UPDATE modulos 
                 SET aula_url = ?, aula_url_2 = ?, resumo = ?, questoes_ids = ?, ultima_atualizacao = NOW()
                 WHERE LOWER(disciplina) = ? AND LOWER(tema) = ?`,
                [urlFinal, url2Final, resumoFinal, questoesIdsJSON, d, t]
            );
            return res.json({ mensagem: "Módulo atualizado com sucesso!" });
        }

        await db.execute(
            `INSERT INTO modulos (disciplina, tema, aula_url, aula_url_2, resumo, questoes_ids, criado_em, ultima_atualizacao)
             VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
            [d, t, urlFinal, url2Final, resumoFinal, questoesIdsJSON]
        );

        res.json({ mensagem: "Módulo criado com sucesso!" });

    } catch (e) {
        console.error("❌ ERRO NA ROTA /modulos/salvar:", e);
        res.status(500).json({ mensagem: "Erro interno ao salvar módulo", detalhe: e.message });
    }
});

// GET → professor ou pagante
app.get('/modulos', apenasAutorizado, async (req, res) => {
    try {
        const { disciplina } = req.query;

        let query = `SELECT * FROM modulos`;
        const params = [];

        if (disciplina) {
            query += ` WHERE LOWER(disciplina) = ?`;
            params.push(normalizarTexto(disciplina));
        }

        query += ` ORDER BY criado_em DESC`;

        const [rows] = await db.execute(query, params);

        const modulos = rows.map(m => ({
            ...m,
            questoes_ids: safeJSONParse(m.questoes_ids, [])
        }));

        res.json(modulos);

    } catch (e) {
        console.error("❌ Erro ao listar módulos:", e);
        res.status(500).json([]);
    }
});

// GET → professor ou pagante
app.get('/modulos/:id', apenasAutorizado, async (req, res) => {
    try {
        const [rows] = await db.execute(`SELECT * FROM modulos WHERE id = ?`, [Number(req.params.id)]);

        if (!rows.length) return res.status(404).json({ erro: "Não encontrado" });

        res.json({ ...rows[0], questoes_ids: safeJSONParse(rows[0].questoes_ids, []) });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({ erro: "Erro ao buscar módulo" });
    }
});

// ==========================================
//    ROTAS DE CRONOGRAMA
// ==========================================

app.post('/salvar', async (req, res) => {
    try {
        const { usuario, totalHoras, cronograma } = req.body;

        if (!usuario) return res.status(400).send("Usuário não identificado.");

        const chaveBusca = String(usuario).toLowerCase().trim();

        const [rows] = await db.execute(
            `SELECT id FROM usuarios WHERE LOWER(email) = ? OR LOWER(nome) = ? LIMIT 1`,
            [chaveBusca, chaveBusca]
        );

        if (!rows.length) return res.status(404).send("Usuário não encontrado.");

        const id = rows[0].id;

        const cronogramaFinal = Array.isArray(cronograma) && cronograma.length
            ? cronograma.filter(i => i && i.dia && i.hora && i.materia)
            : [];

        await db.execute(
            `UPDATE usuarios 
             SET totalHoras = ?, cronograma = ?, ultimaAtualizacao = NOW()
             WHERE id = ?`,
            [
                Number.isFinite(+totalHoras) ? +totalHoras : 0,
                JSON.stringify(cronogramaFinal),
                id
            ]
        );

        console.log(`✅ Cronograma de "${usuario}" salvo no MySQL`);
        res.status(200).send("Salvo com sucesso!");

    } catch (e) {
        console.error("❌ Erro na rota /salvar:", e);
        res.status(500).send("Erro interno ao salvar.");
    }
});

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

        const [rows] = await db.execute(
            `SELECT id, cronograma FROM usuarios WHERE LOWER(email) = ? OR LOWER(nome) = ? LIMIT 1`,
            [usuario, usuario]
        );

        if (!rows.length) return res.status(404).json({ mensagem: "Usuário não encontrado" });

        const user = rows[0];
        let cronograma = safeJSONParse(user.cronograma, []);

        let encontrou = false;
        cronograma = cronograma.map(item => {
            if (item.dia === diaAtual && item.hora === horaAtual) {
                encontrou = true;
                return { ...item, materia: String(materia), status: "concluido" };
            }
            return item;
        });

        if (!encontrou) {
            cronograma.push({ dia: diaAtual, hora: horaAtual, materia: String(materia), status: "concluido" });
        }

        await db.execute(
            `UPDATE usuarios SET cronograma = ?, ultimaAtualizacao = NOW() WHERE id = ?`,
            [JSON.stringify(cronograma), user.id]
        );

        res.json({ mensagem: `Sucesso! Registrado: ${materia}`, dia: diaAtual, hora: horaAtual });

    } catch (erro) {
        console.error("ERRO NO CRONOGRAMA:", erro);
        res.status(500).json({ mensagem: "Erro ao registrar estudo", detalhe: erro.message });
    }
});

// ==========================================
//    ROTAS DE ESTATÍSTICAS / USUÁRIO
// ==========================================

app.get('/usuario/dados', async (req, res) => {
    try {
        const { id, nome } = req.query;

        if ((!id || id === "undefined") && (!nome || nome === "undefined")) {
            return res.status(400).json({ mensagem: "Informe id ou nome" });
        }

        const chaveBusca = String(id || nome).toLowerCase().trim();

        const [rows] = await db.execute(
            `SELECT * FROM usuarios 
             WHERE id = ? OR LOWER(email) = ? OR LOWER(nome) = ?
             LIMIT 1`,
            [isNaN(chaveBusca) ? 0 : Number(chaveBusca), chaveBusca, chaveBusca]
        );

        if (!rows.length) {
            return res.status(404).json({ mensagem: "Usuário não encontrado" });
        }

        const usuario = rows[0];

        const estatisticas = safeJSONParse(usuario.estatisticas, {
            questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} }
        });

        if (!estatisticas.questoes) estatisticas.questoes = { totalAcertos: 0, totalErros: 0, porMateria: {} };
        if (!estatisticas.questoes.porMateria) estatisticas.questoes.porMateria = {};

        res.json({
            ...usuario,
            cronograma: safeJSONParse(usuario.cronograma, []),
            estatisticas,
            aulasAssistidas: Number(usuario.aulasAssistidas) || 0,
            redacoesFeitas: Number(usuario.redacoesFeitas) || 0,
            modulosConcluidos: Number(usuario.modulosConcluidos) || 0,
            questoesFeitas: Number(usuario.questoesFeitas) || 0
        });

    } catch (e) {
        console.error("ERRO NA ROTA /usuario/dados:", e);
        res.status(500).json({ erro: e.message });
    }
});

app.post('/usuario/incrementar', async (req, res) => {
    try {
        const { usuario, campo } = req.body;
        if (!usuario || !campo) return res.status(400).json({ erro: "Dados incompletos" });

        const camposPermitidos = ["aulasAssistidas", "redacoesFeitas", "modulosConcluidos", "questoesFeitas"];

        if (!camposPermitidos.includes(campo)) {
            return res.status(400).json({ erro: "Campo inválido para incremento" });
        }

        const nomeBusca = String(usuario).toLowerCase().trim();

        const [rows] = await db.execute(
            `SELECT id, ${campo} FROM usuarios WHERE LOWER(nome) = ? OR LOWER(email) = ? LIMIT 1`,
            [nomeBusca, nomeBusca]
        );

        if (!rows.length) return res.status(404).json({ erro: "Usuário não encontrado" });

        const novoValor = (Number(rows[0][campo]) || 0) + 1;

        await db.execute(
            `UPDATE usuarios SET ${campo} = ?, ultimaAtualizacao = NOW() WHERE id = ?`,
            [novoValor, rows[0].id]
        );

        res.json({ sucesso: true, novoValor });

    } catch (e) {
        console.error("ERRO NO INCREMENTAR:", e);
        res.status(500).json({ erro: "Erro interno no servidor" });
    }
});

app.post('/usuario/registrar-resposta', async (req, res) => {
    try {
        const { usuario, disciplina, acertou, questao_id } = req.body;

        if (!usuario || !disciplina) {
            return res.status(400).json({ mensagem: "Dados incompletos" });
        }

        const chaveBusca = String(usuario).toLowerCase().trim();

        const [rows] = await db.execute(
            `SELECT id, estatisticas, questoesFeitas, questoesRespondidas 
             FROM usuarios WHERE LOWER(nome) = ? OR LOWER(email) = ? LIMIT 1`,
            [chaveBusca, chaveBusca]
        );

        if (!rows.length) return res.status(404).json({ mensagem: "Usuário não encontrado" });

        const user = rows[0];

        const estatisticas = safeJSONParse(user.estatisticas, {
            questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} }
        });

        if (!estatisticas.questoes) estatisticas.questoes = { totalAcertos: 0, totalErros: 0, porMateria: {} };
        if (!estatisticas.questoes.porMateria) estatisticas.questoes.porMateria = {};

        const disc = String(disciplina).toLowerCase().trim();

        if (!estatisticas.questoes.porMateria[disc]) {
            estatisticas.questoes.porMateria[disc] = { acertos: 0, erros: 0 };
        }

        const isCorrect = acertou === true || String(acertou) === 'true';

        if (isCorrect) {
            estatisticas.questoes.totalAcertos = (Number(estatisticas.questoes.totalAcertos) || 0) + 1;
            estatisticas.questoes.porMateria[disc].acertos = (Number(estatisticas.questoes.porMateria[disc].acertos) || 0) + 1;
        } else {
            estatisticas.questoes.totalErros = (Number(estatisticas.questoes.totalErros) || 0) + 1;
            estatisticas.questoes.porMateria[disc].erros = (Number(estatisticas.questoes.porMateria[disc].erros) || 0) + 1;
        }

        const questoesFeitas = (Number(user.questoesFeitas) || 0) + 1;

        const questoesRespondidas = safeJSONParse(user.questoesRespondidas, []);
        if (questao_id) questoesRespondidas.push(String(questao_id));

        await db.execute(
            `UPDATE usuarios 
             SET estatisticas = ?, questoesFeitas = ?, questoesRespondidas = ?, ultimaAtualizacao = NOW()
             WHERE id = ?`,
            [JSON.stringify(estatisticas), questoesFeitas, JSON.stringify(questoesRespondidas), user.id]
        );

        res.json({ sucesso: true });

    } catch (e) {
        console.error("ERRO DETALHADO NO REGISTRAR-RESPOSTA:", e);
        res.status(500).json({ erro: "Erro interno no servidor", detalhe: e.message });
    }
});

// ==========================================
//    INICIALIZAÇÃO
// ==========================================

app.use(express.static(__dirname, { index: false }));

app.get('/', (req, res) => res.redirect('/inicial.html'));

app.use((req, res) => res.status(404).json({ erro: "Rota não encontrada" }));

app.listen(porta, () => {
    console.log(`🚀 Servidor rodando em http://localhost:${porta}`);
});