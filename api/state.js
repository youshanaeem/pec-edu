// /api/state.js
// Vercel Serverless Function — reads/writes the Student Progress Tracker's
// STATE object to a Neon Postgres database.
//
// GET  /api/state         -> { data: <STATE object> }
// PUT  /api/state         -> body: <STATE object>  -> saves it, returns { ok: true }
//
// Auth: requires header  x-api-key: <APP_API_KEY>  (set as a Vercel env var).
// This is a lightweight shared-secret check, not full user auth — see the
// note in the chat about the current app's single shared-login design.

const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

module.exports = async function handler(req, res) {
  // --- simple shared-secret check ---
  const key = req.headers["x-api-key"];
  if (!process.env.APP_API_KEY || key !== process.env.APP_API_KEY) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    if (req.method === "GET") {
      const rows = await sql`SELECT data FROM app_state WHERE id = 1`;
      res.status(200).json({ data: rows[0] ? rows[0].data : null });
      return;
    }

    if (req.method === "PUT" || req.method === "POST") {
      let body = req.body;
      // Vercel usually parses JSON automatically, but guard just in case.
      if (typeof body === "string") body = JSON.parse(body);

      await sql`
        INSERT INTO app_state (id, data, updated_at)
        VALUES (1, ${JSON.stringify(body)}::jsonb, now())
        ON CONFLICT (id)
        DO UPDATE SET data = ${JSON.stringify(body)}::jsonb, updated_at = now()
      `;
      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error", details: String(err) });
  }
};
