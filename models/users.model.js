import { execute } from '../config/db.js';

export async function getUserById(id_users) {
  const rows = await execute('SELECT * FROM users WHERE id_users = ? LIMIT 1', [id_users]);
  return rows[0] ?? null;
}

export async function upsertUser(user) {
  await execute(
    `
      INSERT INTO users (
        id_users,
        nom,
        prenoms,
        email,
        classe,
        phone,
        img_path,
        is_subscribed,
        subscription_date,
        subscription_expiry,
        first_use_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nom = VALUES(nom),
        prenoms = VALUES(prenoms),
        email = VALUES(email),
        classe = VALUES(classe),
        phone = VALUES(phone),
        img_path = COALESCE(VALUES(img_path), img_path),
        is_subscribed = VALUES(is_subscribed),
        subscription_date = VALUES(subscription_date),
        subscription_expiry = VALUES(subscription_expiry),
        first_use_time = COALESCE(first_use_time, VALUES(first_use_time))
    `,
    [
      user.id_users,
      user.nom,
      user.prenoms,
      user.email,
      user.classe,
      user.phone,
      user.img_path,
      user.is_subscribed,
      user.subscription_date,
      user.subscription_expiry,
      user.first_use_time
    ]
  );

  return getUserById(user.id_users);
}
