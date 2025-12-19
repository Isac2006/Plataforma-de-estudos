import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Configuração necessária para módulos ES (import/export) encontrar caminhos no Node.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function pegarquestoesdobanco(disciplina, tema) {
    
    // 2. Ajuste do Caminho Dinâmico
    // '..' sai de 'modulos', '..' sai de 'src' e entra na pasta do banco
    const caminhoArquivo = path.join(__dirname, '..', '..', 'banco de dados provisorio', 'bancoquestoes.json');

    try {
        // 3. Verificação de existência (evita erro de 'file not found')
        if (!fs.existsSync(caminhoArquivo)) {
            console.error("❌ Arquivo não encontrado em:", caminhoArquivo);
            return [];
        }

        // 4. Leitura síncrona (compatível com a chamada sem 'await' no server)
        const dadosRaw = fs.readFileSync(caminhoArquivo, 'utf-8');

        // 5. Tratamento de JSON vazio
        const todasAsQuestoes = JSON.parse(dadosRaw.trim() || '[]');

        // 6. Filtro com validação de segurança
        return todasAsQuestoes.filter(questao => {
            return (
                questao.disciplina?.toLowerCase() === disciplina?.toLowerCase() && 
                questao.tema?.toLowerCase() === tema?.toLowerCase()
            );
        });

    } catch (erro) {
        console.error("❌ Erro no módulo de banco:", erro.message);
        return [];
    }
}