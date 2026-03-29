// pegar disciplina da URL
const params = new URLSearchParams(window.location.search);
const disciplina = params.get("disciplina");

// elementos da página
const titulo = document.getElementById("titulo-disciplina");
const lista = document.getElementById("listaModulos");

// ícones
const icones = {
    matematica: "📐",
    portugues: "📖",
    historia: "🏛️",
    geografia: "🌎",
    fisica: "⚡",
    quimica: "🧪",
    biologia: "🧬",
    filosofia: "🤔",
    sociologia: "👥",
    ciencias: "🔬"
};

const nomes = {
    matematica: "Matemática",
    portugues: "Português",
    historia: "História",
    geografia: "Geografia",
    ciencias: "Ciências",
    filosofia: "Filosofia",
    sociologia: "Sociologia",
    fisica: "Física"
};

titulo.textContent = `${icones[disciplina]} ${nomes[disciplina]}`;

const API_BASE = "http://localhost:3000";

async function carregarMaterias() {

    const res = await fetch(`${API_BASE}/materias`);
    const materias = await res.json();

    const materiasFiltradas = materias.filter(
        m => m.disciplina === disciplina
    );

    renderizarMaterias(materiasFiltradas);
}

function renderizarMaterias(materiasFiltradas){

    lista.innerHTML = "";

    if (materiasFiltradas.length === 0) {
        lista.innerHTML = `
            <div class="sem-materias">
                Nenhuma matéria cadastrada ainda.
            </div>
        `;
        return;
    }

    materiasFiltradas.forEach(materia => {

        const card = document.createElement("div");
        card.className = "card-tema";

        card.innerHTML = `
            <h3>${materia.tema}</h3>
            <p>${materia.resumo}</p>
        `;

        card.addEventListener("click", () => {
            window.location.href = `materia-detalhe.html?id=${materia.id}`;
        });

        lista.appendChild(card);

    });

}

carregarMaterias();