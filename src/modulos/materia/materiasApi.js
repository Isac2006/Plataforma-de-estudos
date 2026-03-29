const API_BASE = "http://localhost:3000";

async function apiFetch(endpoint, options = {}) {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {

        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            signal: controller.signal
        });

        clearTimeout(timeout);

        const contentType = response.headers.get("content-type");

        if (!response.ok) {
            throw new Error(`Erro ${response.status}`);
        }

        if (!contentType || !contentType.includes("application/json")) {

            const text = await response.text();

            throw new Error(
                "Servidor retornou HTML:\n" + text.slice(0, 200)
            );

        }

        return await response.json();

    } catch (error) {

        console.error(`❌ Erro na API (${endpoint}):`, error);

        throw error;

    }

}

export async function buscarDisciplinas() {
    return apiFetch("/disciplinas");
}

export async function buscarMaterias() {
    return apiFetch("/materias");
}

export async function buscarModulosPorDisciplina(disciplina) {

    return apiFetch(
        `/modulos?disciplina=${encodeURIComponent(disciplina)}`
    );

}

export async function buscarQuestoesPorIds(ids) {

    return apiFetch(
        `/api/questoes?ids=${encodeURIComponent(ids.join(","))}`
    );

}

export async function registrarRespostaQuestao(dados) {

    return apiFetch("/usuario/registrar-resposta", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(dados)
    });

}

export async function buscarAula(disciplina, tema) {

    return apiFetch(
        `/aulas/buscar?disciplina=${encodeURIComponent(disciplina)}&tema=${encodeURIComponent(tema)}`
    );

}

export async function uploadImagem(file) {

    const formData = new FormData();
    formData.append("imagem", file);

    const response = await fetch(`${API_BASE}/upload-imagem`, {
        method: "POST",
        body: formData
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.erro || "Erro no upload");
    }

    return data;
}