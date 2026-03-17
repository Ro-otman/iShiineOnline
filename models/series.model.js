import { execute } from '../config/db.js';

export async function listSeriesForClasse(nom_classe) {
  return execute(
    `
      SELECT
        s.id_serie,
        s.nom_serie,
        ts.id_type,
        ts.nom_type
      FROM classes c
      JOIN classe_serie cs ON cs.id_classe = c.id_classe
      JOIN series s ON s.id_serie = cs.id_serie
      JOIN type_series ts ON ts.id_type = s.id_type
      WHERE c.nom_classe = ?
      ORDER BY s.nom_serie ASC
    `,
    [nom_classe]
  );
}

export async function getSerieByIdOrName(roomId) {
  const isNumericId = /^[0-9]+$/.test(String(roomId));

  const rows = await execute(
    isNumericId
      ? 'SELECT id_serie, nom_serie, id_type FROM series WHERE id_serie = ? LIMIT 1'
      : 'SELECT id_serie, nom_serie, id_type FROM series WHERE nom_serie = ? LIMIT 1',
    [isNumericId ? Number(roomId) : String(roomId)]
  );

  return rows[0] ?? null;
}
