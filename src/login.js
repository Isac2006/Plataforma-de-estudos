const form = document.getElementById('loginForm');
const erroEl = document.getElementById('erro');
const box = document.querySelector('.login-box');

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const login = document.getElementById('login').value.trim();
    const senha = document.getElementById('senha').value.trim();

    limparErro();

    if (!login || !senha) {
        mostrarErro('Informe email ou CPF e senha');
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ login, senha })
        });

        const data = await response.json();

        if (!response.ok) {
            mostrarErro(data.erro || 'Erro ao realizar login');
            return;
        }

        /*
          🔴 AQUI ESTAVA O PROBLEMA
          Agora salvamos tudo que o front precisa:
          id, nome, tipo (e email se quiser)
        */
        localStorage.setItem(
            'usuarioLogado',
            JSON.stringify({
                id: data.id,
                nome: data.nome,
                tipo: data.tipo,     // 🔥 ESSENCIAL
                email: data.email    // opcional
            })
        );

        // 🚀 redireciona
        window.location.replace('inicial.html');

    } catch (err) {
        mostrarErro('Erro ao conectar com o servidor');
        console.error(err);
    }
});

/* ======================== FUNÇÕES AUXILIARES ======================== */

function mostrarErro(mensagem) {
    erroEl.textContent = mensagem;
    erroEl.classList.add('show');
    box.classList.add('error');

    setTimeout(() => {
        box.classList.remove('error');
    }, 400);
}

function limparErro() {
    erroEl.textContent = '';
    erroEl.classList.remove('show');
}
