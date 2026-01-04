// public/modulos/gerenciador.js

export default class GerenciadorEducacional {
  constructor(usuariosIniciais = [], redacoesIniciais = []) {
    const listaUsuarios = Array.isArray(usuariosIniciais) ? usuariosIniciais : [];
    this.usuarios = this.formatarUsuariosIniciais(listaUsuarios);
    this.redacoes = Array.isArray(redacoesIniciais) ? redacoesIniciais : [];
  }

  formatarUsuariosIniciais(usuarios) {
    if (!Array.isArray(usuarios)) return [];
    return usuarios.map(user => ({
      // Prioriza o ID que vem do banco (_id para Mongo, id para SQL/outros)
      id: user.id || user._id || null, 
      nome: "",
      email: "",
      acessoBloqueado: false,
      progressoCurso: 0,
      pagamentos: {
        mes1: "pendente", mes2: "pendente", mes3: "pendente",
        mes4: "pendente", mes5: "pendente", mes6: "pendente"
      },
      aulasAssistidas: 0,
      redacoesFeitas: 0,
      modulosConcluidos: 0,
      questoesFeitas: 0,
      estatisticas: { 
          questoes: { totalAcertos: 0, totalErros: 0, porMateria: {} } 
      },
      cronograma: [],
      ultimaAtualizacao: new Date().toISOString(),
      ...user // Mantém os dados existentes (sobrescrevendo os padrões acima)
    }));
  }

  // --- BUSCA CENTRALIZADA POR ID ---
  getUsuario(id) {
    if (!id) return null;
    // Converte ambos para String para evitar erro de tipo (ex: "123" vs 123)
    // E verifica tanto 'id' quanto '_id' para compatibilidade
    return this.usuarios.find(u => 
        String(u.id) === String(id) || String(u._id) === String(id)
    );
  }
  
  // Retorna todos
  getUsuarios() { return this.usuarios; }

  // --- MÉTODOS DE AÇÃO (Agora pedem ID) ---

  registrarAulaConcluida(id, totalAulasNoBanco) {
    const usuario = this.getUsuario(id); // Busca por ID
    if (!usuario) return null;

    // 1. Incrementa aulas assistidas (limita ao total do banco)
    if (usuario.aulasAssistidas < totalAulasNoBanco) {
      usuario.aulasAssistidas++;
    }

    // 2. Cálculo Matemático Real
    const total = totalAulasNoBanco > 0 ? totalAulasNoBanco : 1;
    const calculo = (usuario.aulasAssistidas / total) * 100;
    usuario.progressoCurso = Math.min(100, Math.round(calculo));
    
    usuario.ultimaAtualizacao = new Date().toISOString();
    return usuario;
  }

  // Ao adicionar, geralmente não temos ID ainda (o banco cria), 
  // então verificamos duplicidade pelo E-MAIL, que é mais seguro que nome.
  adicionarUsuario(dados) {
    const existe = this.usuarios.find(u => u.email === dados.email);
    if (existe) throw new Error("Já existe um usuário com este e-mail.");
    
    const novo = this.formatarUsuariosIniciais([dados])[0];
    this.usuarios.push(novo);
    return novo;
  }

  excluirUsuario(id) {
    const removido = this.getUsuario(id);
    if (!removido) return null;
    
    // Filtra removendo quem tiver esse ID
    this.usuarios = this.usuarios.filter(u => 
        String(u.id) !== String(id) && String(u._id) !== String(id)
    );
    return removido;
  }

  atualizarPagamento(id, mes, status) {
    const usuario = this.getUsuario(id);
    if (usuario && mes >= 1 && mes <= 6) {
        usuario.pagamentos[`mes${mes}`] = status;
        usuario.ultimaAtualizacao = new Date().toISOString();
    }
    return usuario;
  }

  editarUsuario(id, novosDados) {
    // Busca o índice usando ID
    const index = this.usuarios.findIndex(u => 
        String(u.id) === String(id) || String(u._id) === String(id)
    );
    
    if (index === -1) {
      throw new Error("Usuário não encontrado para edição (ID inválido).");
    }

    // Garante que não estamos apagando o ID acidentalmente
    // Se novosDados não tiver ID, mantemos o antigo
    const idAntigo = this.usuarios[index].id || this.usuarios[index]._id;

    this.usuarios[index] = {
      ...this.usuarios[index],
      ...novosDados,
      id: idAntigo, // Força a manutenção do ID
      ultimaAtualizacao: new Date().toISOString()
    };

    return this.usuarios[index];
  }

  alternarBloqueio(id) {
    const usuario = this.getUsuario(id);
    if (usuario) {
        usuario.acessoBloqueado = !usuario.acessoBloqueado;
        usuario.ultimaAtualizacao = new Date().toISOString();
    }
    return usuario;
  }
}