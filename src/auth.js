// src/auth.js
export function obterUsuarioLogado() {
    const dados = localStorage.getItem("usuarioLogado");
    if (!dados) return null;

    try {
        return JSON.parse(dados);
    } catch {
        return null;
    }
}
