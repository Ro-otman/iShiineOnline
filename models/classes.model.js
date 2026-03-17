import { execute } from '../config/db.js';

export async function getClasseByName(nom_classe) {
  const rows = await execute(
    'SELECT id_classe, nom_classe, id_niveau FROM classes WHERE nom_classe = ? LIMIT 1',
    [nom_classe]
  );

  return rows[0] ?? null;
}
