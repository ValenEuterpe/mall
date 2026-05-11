# Changing the Mall Owner Email & Password

The mall owner is a single admin account stored in the `MallOwner` table.
Use the one-shot script below to create it or update its credentials — it
will not touch any other data.

## Steps

1. Open `.env.local` at the project root and set:

   ```
   MALL_OWNER_EMAIL=new-owner@example.com
   MALL_OWNER_PASSWORD=ChooseAStrongPassword
   MALL_OWNER_NAME=Mall Administrator
   MALL_OWNER_PHONE=
   MALL_OWNER_ALLOWED_IPS=
   ```

   - To change the **password** only: keep the existing `MALL_OWNER_EMAIL`
     and set a new `MALL_OWNER_PASSWORD`.
   - To change the **email**: set a new `MALL_OWNER_EMAIL`. This creates a
     new row. If you want to keep only one owner, delete the old row from
     the Supabase dashboard (Table Editor → `MallOwner`) afterwards.
   - `MALL_OWNER_ALLOWED_IPS` is optional. Leave empty for open access, or
     provide a comma-separated list of IPs.

2. Make sure `DIRECT_URL` in `.env.local` points at the **production**
   database (Supabase Session Pooler URL on port 5432, with the real
   password, no `?pgbouncer` suffix).

3. Run the script from the project root:

   ```
   npx tsx prisma/create-mall-owner.ts
   ```

   Successful output:

   ```
   ✅ Mall Owner ready: new-owner@example.com (id: ...)
   ```

4. Log in at `https://your-domain.com/en/auth/mall-owner/login` with the
   new credentials.

## Notes

- The script uses **upsert**: if a row with that email already exists, it
  updates the password and other fields in place. If no row exists, it
  creates one.
- The password is hashed with bcrypt before being stored. The plaintext
  value never leaves your local machine.
- No code deployment is required — credentials live in the database, not
  in the source.
- Never commit `.env.local`. It is already in `.gitignore`.
