document.getElementById('cadastroForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value.trim();
    const email = document.getElementById('email').value.trim();
    const cpf = document.getElementById('cpf').value.trim();
    const senha = document.getElementById('senha').value.trim();
    const confirmarSenha = document.getElementById('confirmarSenha').value.trim();
    const erroEl = document.getElementById('erro');

    erroEl.innerText = '';

    if (!nome || !email || !cpf || !senha || !confirmarSenha) {
        erroEl.innerText = 'Preencha todos os campos';
        return;
    }

    if (!/^\d{11}$/.test(cpf)) {
        erroEl.innerText = 'CPF deve conter 11 números';
        return;
    }

    if (senha.length < 6) {
        erroEl.innerText = 'A senha deve ter no mínimo 6 caracteres';
        return;
    }

    if (senha !== confirmarSenha) {
        erroEl.innerText = 'As senhas não conferem';
        return;
    }

    try {
        const response = await fetch('http://localhost:3000/auth/registrar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome,          // ✅ corrigido
                email,
                senha,
                cpf,
                tipo: "aluno"  // ✅ obrigatório para o backend
            })
        });

        const data = await response.json();

        if (!response.ok) {
            erroEl.innerText = data.erro || 'Erro ao cadastrar';
            return;
        }

        alert('Cadastro realizado com sucesso!');
        window.location.href = 'login.html';

    } catch (err) {
        erroEl.innerText = 'Erro ao conectar com o servidor';
        console.error(err);
    }
});
