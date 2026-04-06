# ishiineOnline

Backend Express/MySQL de l'application iShiine.

## Points importants

- Les routes mobile sensibles utilisent maintenant un token d'acces utilisateur signe cote serveur.
- Le frontend ne doit plus envoyer librement `userId`, `is_subscribed`, `subscription_date` ou `subscription_expiry` pour les flux publics.
- Les paiements et l'activation premium restent pilotes par le serveur.

## Demarrage local

1. Copier [`.env.example`](./.env.example) vers `.env` et renseigner les valeurs reelles.
2. Installer les dependances:

```bash
npm install
```

3. Lancer le serveur:

```bash
node app.js
```

Endpoints utiles:

- `POST /auth/mobile/session`
- `GET /health`
- `GET /version`
- `POST /payments/checkout/init`
- `POST /payments/checkout/verify`

## Variables critiques

- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `USER_ACCESS_TOKEN_SECRET`
- `FEDAPAY_SECRET_KEY`
- `PAYMENT_CALLBACK_BASE_URL`
- `ADMIN_ACCESS_TOKEN_SECRET`
- variables Firebase si les notifications push sont actives

## Tests

```bash
node --test
node --check app.js
```
