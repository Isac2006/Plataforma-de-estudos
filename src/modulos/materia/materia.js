console.log("🔥 materias.js carregado");

/* ================================
IMPORTS
================================ */
import { obterUsuarioLogado } from "../../auth.js";
import { somenteProfessor } from "../controleAcesso.js";

import { cadastrarMateria } from "../cadastrarmateria.js";
import { iniciarGridMaterias } from "./gridMaterias.js";
import { iniciarListaMaterias } from "./listaMaterias.js";
import { iniciarExplorer } from "./explorer.js"; // Chama o explorer separado
import { cadastrarAula, carregarAula } from "../aula.js";
import { buscarMaterias } from "./materiasApi.js";

/* ================================
AUTENTICAÇÃO
================================ */
const usuario = obterUsuarioLogado();
if (!usuario) {
    window.location.replace("login.html");
    throw new Error("Usuário não autenticado");
}

/* ================================
BOTÕES
================================ */
function configurarEventos() {
    const btnCadastrarMateria = document.getElementById("btn-cadastrar-materia");
    if (btnCadastrarMateria) {
        btnCadastrarMateria.addEventListener("click", cadastrarMateria);
    }
}

/* ================================
INICIALIZAÇÃO
================================ */
document.addEventListener("DOMContentLoaded", () => {
    console.log("🚀 Inicializando página de matérias");

    somenteProfessor("#formulario-cadastro", "ocultar");
    somenteProfessor("#professores", "ocultar");

    configurarEventos();

    // Grid e lista de matérias cadastradas
    iniciarGridMaterias();
    iniciarListaMaterias();
    buscarMaterias();

    // Explorer separado (disciplinas e módulos)
    iniciarExplorer();

    // Eventos de aula
    document.getElementById("btn-cadastrar-aula")?.addEventListener("click", cadastrarAula);
    document.getElementById("select-tema-aula")?.addEventListener("change", () => {
        const usuario = obterUsuarioLogado();
        carregarAula(usuario);
    });
});