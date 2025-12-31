// public/Gerenciador.js

export default class GerenciadorEducacional {
  constructor(usuariosIniciais = [], redacoesIniciais = []) {
    const listaUsuarios = Array.isArray(usuariosIniciais) ? usuariosIniciais : [];
    this.usuarios = this.formatarUsuariosIniciais(listaUsuarios);
    this.redacoes = Array.isArray(redacoesIniciais) ? redacoesIniciais : [];
  }

  formatarUsuariosIniciais(usuarios) {
    if (!Array.isArray(usuarios)) return [];
    return usuarios.map(user => ({
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
      ...user // Mantém os dados existentes se houver
    }));
  }

  // NOVO: Método que resolve o problema do cálculo
  registrarAulaConcluida(nome, totalAulasNoBanco) {
    const usuario = this.getUsuario(nome);
    if (!usuario) return null;

    // 1. Incrementa aulas assistidas (limita ao total do banco)
    if (usuario.aulasAssistidas < totalAulasNoBanco) {
      usuario.aulasAssistidas++;
    }

    // 2. Cálculo Matemático Real: (Assistidas / Total) * 100
    const calculo = (usuario.aulasAssistidas / totalAulasNoBanco) * 100;
    usuario.progressoCurso = Math.min(100, Math.round(calculo));
    
    usuario.ultimaAtualizacao = new Date().toISOString();
    return usuario;
  }

  getUsuarios() { return this.usuarios; }

  getUsuario(nome) {
    if (!nome || typeof nome !== 'string') return null;
    return this.usuarios.find(u => u.nome && u.nome.toLowerCase() === nome.toLowerCase());
  }

  adicionarUsuario(dados) {
    if (this.getUsuario(dados.nome)) throw new Error("Usuário já existe.");
    const novo = this.formatarUsuariosIniciais([dados])[0];
    this.usuarios.push(novo);
    return novo;
  }

  excluirUsuario(nome) {
    const removido = this.getUsuario(nome);
    if (!removido) return null;
    this.usuarios = this.usuarios.filter(u => u.nome.toLowerCase() !== nome.toLowerCase());
    return removido;
  }

  atualizarPagamento(nome, mes, status) {
    const usuario = this.getUsuario(nome);
    if (usuario && mes >= 1 && mes <= 6) usuario.pagamentos[`mes${mes}`] = status;
    return usuario;
  }

  alternarBloqueio(nome) {
    const usuario = this.getUsuario(nome);
    if (usuario) usuario.acessoBloqueado = !usuario.acessoBloqueado;
    return usuario;
  }
}