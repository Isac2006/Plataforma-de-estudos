
import { obterUsuarioLogado } from '../auth.js';
import { buscarDadosParaModulo, finalizarModulo } from './construtor.js';
import { somenteProfessor } from "./controleAcesso.js";

document.addEventListener("DOMContentLoaded", () => {

    // 🔒 Oculta área inteira
    somenteProfessor(".bloco modulo", "ocultar");

});

/* ===============================
   AUTENTICAÇÃO
================================ */

const usuario = obterUsuarioLogado();
console.log("Usuário logado:", usuario);

if (!usuario) {
    window.location.replace('login.html');
    throw new Error('Usuário não autenticado');
}

/* ===============================
   TOPO – NOME DO USUÁRIO
================================ */

const nomeEl = document.getElementById('nomeUsuario');
if (nomeEl) nomeEl.innerText = usuario.nome;

/* ===============================
   BLOQUEIO DE PROFESSOR
================================ */

if (usuario.tipo !== 'professor') {
    const modulo = document.querySelector('.modulo');
    if (modulo) modulo.style.display = 'none';
}

/* ===============================
   DADOS DO SERVIDOR
================================ */

fetch(`http://localhost:3000/usuario/dados?id=${encodeURIComponent(usuario.id)}`)
    .then(async res => {
        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }
        return res.json();
    })
    .then(dados => {
        document.getElementById('questoesFeitas').innerText = dados.questoesFeitas || 0;
        document.getElementById('aulasAssistidas').innerText = dados.aulasAssistidas || 0;
        document.getElementById('redacoesFeitas').innerText = dados.redacoesFeitas || 0;

        const acertos = Number(dados?.estatisticas?.questoes?.totalAcertos) || 0;
        const erros   = Number(dados?.estatisticas?.questoes?.totalErros) || 0;

        const taxa = (acertos + erros) > 0
            ? Math.round((acertos / (acertos + erros)) * 100)
            : 0;

        document.getElementById('taxaAcerto').innerText = taxa + '%';
    })
    .catch(err => console.error('Erro ao carregar desempenho:', err));

/* ===============================
   EVENTOS DO CONSTRUTOR
================================ */

const selectMateria = document.getElementById("selectMateria");
const selectTema = document.getElementById("selectTema");
const btnSalvar = document.getElementById("btnSalvarModulo");

if (selectMateria && selectTema) {
    selectMateria.addEventListener("change", () => {
        selectTema.disabled = false;
    });
}

if (selectTema) {
    selectTema.addEventListener("change", buscarDadosParaModulo);
}

if (btnSalvar) {
    btnSalvar.addEventListener("click", finalizarModulo);
}

/* ===============================
   MATÉRIAS
================================ */

async function carregarMaterias() {
    if (!selectMateria) return;

    try {
        const res = await fetch("http://localhost:3000/materias");

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }

        const materias = await res.json();

        // 🔥 pega disciplinas únicas
        const disciplinasUnicas = [
            ...new Set(materias.map(m => m.disciplina))
        ];

        selectMateria.innerHTML = `<option value="">Escolha a matéria...</option>`;

        disciplinasUnicas.forEach(disciplina => {
            const opt = document.createElement("option");
            opt.value = disciplina;
            opt.textContent =
                disciplina.charAt(0).toUpperCase() + disciplina.slice(1);
            selectMateria.appendChild(opt);
        });

    } catch (err) {
        console.error("Erro ao carregar matérias:", err);
        selectMateria.innerHTML =
            `<option value="">Erro ao carregar matérias</option>`;
    }
}

/* ===============================
   TEMAS
================================ */

async function carregarTemas() {
    const materia = selectMateria.value;
    if (!materia) return;

    selectTema.innerHTML = `<option value="">Carregando temas...</option>`;

    try {
        const res = await fetch(`http://localhost:3000/temas?disciplina=${encodeURIComponent(materia)}`);

        if (!res.ok) {
            const txt = await res.text();
            throw new Error(txt);
        }

        const temas = await res.json();

        selectTema.innerHTML = `<option value="">Escolha o tema...</option>`;

        temas.forEach(tema => {
            const opt = document.createElement("option");
            opt.value = tema;
            opt.textContent = tema;
            selectTema.appendChild(opt);
        });

    } catch (e) {
        console.error("Erro ao carregar temas:", e);
        selectTema.innerHTML = `<option value="">Erro ao carregar temas</option>`;
    }
}

if (selectMateria) {
    selectMateria.addEventListener("change", carregarTemas);
}

document.addEventListener("DOMContentLoaded", carregarMaterias);
