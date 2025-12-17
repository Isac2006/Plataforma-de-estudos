// 1. Importamos os módulos nativos do Node.js
import fs from 'fs';
import path from 'path';

/**
 * Função que lê o arquivo JSON e filtra as questões
 * @param {string} disciplina - A disciplina vinda do select
 * @param {string} tema - O tema vindo do segundo select
 */
export function pegarquestoesdobanco(disciplina, tema) {
    
    // 2. Ajuste do Caminho (Baseado na sua foto do VS Code)
    // O arquivo está em: banco de dados provisorio/bancoquestoes.json
    const caminhoArquivo = path.resolve('banco de dados provisorio', 'bancoquestoes.json');

    try {
        // 3. Lemos o arquivo JSON
        const dadosRaw = fs.readFileSync(caminhoArquivo, 'utf-8');

        // 4. Transformamos em Objeto JS
        const todasAsQuestoes = JSON.parse(dadosRaw);

        // 5. Filtramos as questões
        const questoesFiltradas = todasAsQuestoes.filter(questao => {
            // Usamos .toLowerCase() para evitar erros de maiúsculas/minúsculas
            return questao.disciplina.toLowerCase() === disciplina.toLowerCase() && 
                   questao.tema.toLowerCase() === tema.toLowerCase();
        });

        return questoesFiltradas;

    } catch (erro) {
        console.error("Erro ao ler o arquivo JSON:", erro.message);
        return []; // Retorna um array vazio se der erro (ex: arquivo não encontrado)
    }
}