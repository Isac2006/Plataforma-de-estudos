import db from '../../db.js';

export async function pegarquestoesdobanco(disciplina, tema) {
    try {
        const d = disciplina?.toLowerCase().trim() || '';

        if (!d) return [];

        let query = `SELECT * FROM questoes WHERE LOWER(disciplina) = ?`;
        const params = [d];

        if (tema) {
            query += ` AND LOWER(tema) LIKE ?`;
            params.push(`%${tema.toLowerCase().trim()}%`);
        }

        const [rows] = await db.execute(query, params);

        return rows.map(q => ({
            ...q,
            alternativas: typeof q.alternativas === 'string'
                ? JSON.parse(q.alternativas)
                : q.alternativas
        }));

    } catch (erro) {
        console.error("❌ Erro ao buscar questões no banco:", erro.message);
        return [];
    }
}