import { obterUsuarioLogado } from "../auth.js";

export function somenteProfessor(seletor, opcao = "ocultar") {
    const usuario = obterUsuarioLogado();

    const elementos = document.querySelectorAll(seletor);

    if (!usuario || usuario.tipo !== "professor") {
        elementos.forEach(el => {
            if (opcao === "ocultar") {
                el.style.display = "none";
            }

            if (opcao === "desabilitar") {
                el.disabled = true;
                el.style.opacity = "0.6";
                el.style.cursor = "not-allowed";
            }

            if (opcao === "bloquear") {
                el.innerHTML = "🔒 Apenas professores podem acessar essa área.";
            }
        });

        return false;
    }

    return true;
}