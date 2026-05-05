-- ==========================================
--    CRIAR BANCO
-- ==========================================

CREATE DATABASE IF NOT EXISTS plataforma CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE plataforma;

-- ==========================================
--    USUÁRIOS
-- ==========================================

CREATE TABLE IF NOT EXISTS usuarios (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    nome                VARCHAR(255) NOT NULL,
    email               VARCHAR(255) NOT NULL UNIQUE,
    senha               VARCHAR(255) NOT NULL,
    cpf                 VARCHAR(14) NOT NULL UNIQUE,
    tipo                ENUM('aluno', 'professor') NOT NULL DEFAULT 'aluno',
    aulasAssistidas     INT DEFAULT 0,
    redacoesFeitas      INT DEFAULT 0,
    modulosConcluidos   INT DEFAULT 0,
    questoesFeitas      INT DEFAULT 0,
    totalHoras          FLOAT DEFAULT 0,
    cronograma          JSON,
    estatisticas        JSON,
    questoesRespondidas JSON,
    ultimaAtualizacao   DATETIME DEFAULT NOW()
);

-- ==========================================
--    REDAÇÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS redacoes (
    id              BIGINT PRIMARY KEY,
    usuario         VARCHAR(255) NOT NULL,
    titulo          VARCHAR(255) NOT NULL,
    conteudo_html   LONGTEXT NOT NULL,
    status          ENUM('pendente', 'corrigida') DEFAULT 'pendente',
    comentarios     JSON,
    data_envio      DATETIME DEFAULT NOW(),
    data_correcao   DATETIME
);

-- ==========================================
--    TEMAS DE REDAÇÃO
-- ==========================================

CREATE TABLE IF NOT EXISTS temas_redacao (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    tema        VARCHAR(255) NOT NULL,
    texto1      TEXT NOT NULL,
    texto2      TEXT,
    texto3      TEXT,
    imagem1     VARCHAR(500),
    imagem2     VARCHAR(500),
    criado_em   DATETIME DEFAULT NOW()
);

-- ==========================================
--    MATÉRIAS
-- ==========================================

CREATE TABLE IF NOT EXISTS materias (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    disciplina  VARCHAR(100) NOT NULL,
    tema        VARCHAR(255) NOT NULL,
    resumo      TEXT NOT NULL,
    secoes      JSON,
    criado_em   DATETIME DEFAULT NOW()
);

-- ==========================================
--    AULAS
-- ==========================================

CREATE TABLE IF NOT EXISTS aulas (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    disciplina      VARCHAR(100) NOT NULL,
    tema            VARCHAR(255) NOT NULL,
    aula_url        VARCHAR(500) NOT NULL,
    aula_url_2      VARCHAR(500),
    data_cadastro   DATETIME DEFAULT NOW()
);

-- ==========================================
--    QUESTÕES
-- ==========================================

CREATE TABLE IF NOT EXISTS questoes (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    disciplina          VARCHAR(100) NOT NULL,
    tema                VARCHAR(255) NOT NULL,
    enunciado           TEXT NOT NULL,
    alternativas        JSON NOT NULL,
    resposta_correta    VARCHAR(500) NOT NULL,
    explicacao          TEXT,
    imagem              VARCHAR(500),
    criado_em           DATETIME DEFAULT NOW()
);

-- ==========================================
--    MÓDULOS
-- ==========================================

CREATE TABLE IF NOT EXISTS modulos (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    disciplina          VARCHAR(100) NOT NULL,
    tema                VARCHAR(255) NOT NULL,
    aula_url            VARCHAR(500),
    aula_url_2          VARCHAR(500),
    resumo              TEXT,
    questoes_ids        JSON,
    criado_em           DATETIME DEFAULT NOW(),
    ultima_atualizacao  DATETIME DEFAULT NOW()
);