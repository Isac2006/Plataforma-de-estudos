/* ==========================================
   FUNÇÕES UTILITÁRIAS
========================================== */

/* Capitalizar texto */
export function capitalizar(txt) {
    if (!txt || typeof txt !== "string") return "";
    return txt.charAt(0).toUpperCase() + txt.slice(1);
}

/* Remover acentos e padronizar */
export function normalizarTexto(texto) {
    return texto
        ?.normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

/* Formatar título do tema */
export function formatarTemaExibicao(texto) {
    return texto
        ?.toLowerCase()
        .split(/\s+/)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
}

/* Destacar texto da busca */
export function destacarTexto(texto, termo) {

    if (!termo) return texto;

    const termoEscapado = termo.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const regex = new RegExp(`(${termoEscapado})`, "gi");

    return texto.replace(regex, '<span class="highlight">$1</span>');
}

/* Converter link YouTube para embed */
export function converterYoutubeEmbed(url) {

    if (!url) return "";

    const id = url.split("v=")[1]?.split("&")[0];

    return `https://www.youtube.com/embed/${id}`;
}

/* Converter URLs de vídeo (versão usada nos módulos) */
export function converterParaEmbed(url) {

    if (!url) return null;

    if (url.includes("watch?v=")) {
        const videoId = url.split("watch?v=")[1].split("&")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    if (url.includes("youtu.be/")) {
        const videoId = url.split("youtu.be/")[1].split("?")[0];
        return `https://www.youtube.com/embed/${videoId}`;
    }

    return url;
}