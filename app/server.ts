import express from "express";
import session from "express-session";
import cookieParser from "cookie-parser";
import path from "path";
import crypto from "crypto";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: "poc-secret-do-not-use-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // secure: true, // would require HTTPS — disabled only because this POC runs on http://localhost
    },
  })
);

// Basic security headers (inspected by tests/04-security.spec.ts)
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Content-Security-Policy", "default-src 'self'");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

const USERS = [{ username: "admin", password: "password123" }];

// Generates a simple per-session CSRF token
app.get("/api/csrf-token", (req, res) => {
  const token = crypto.randomBytes(16).toString("hex");
  (req.session as any).csrfToken = token;
  res.json({ csrfToken: token });
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find((u) => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).send("Invalid credentials");
  }
  (req.session as any).user = username;
  res.redirect("/dashboard.html");
});

app.get("/api/me", (req, res) => {
  const user = (req.session as any).user;
  if (!user) return res.status(401).json({ error: "not authenticated" });
  res.json({ username: user });
});

// "Safe" search endpoint: escapes the input (correct/expected behavior)
app.get("/api/search", (req, res) => {
  const q = String(req.query.q ?? "");
  res.json({ query: q, results: [`result for "${q}"`, "item 1", "item 2"] });
});

/**
 * Route intentionally vulnerable to reflected XSS — exists ONLY so the
 * security test (04-security.spec.ts) can demonstrate how to detect this
 * kind of flaw. Never do this in a real application.
 */
app.get("/vulnerable-search", (req, res) => {
  const q = String(req.query.q ?? "");
  res.send(`<html><body><h1>Results for: ${q}</h1></body></html>`);
});

app.post("/api/action", (req, res) => {
  const csrfHeader = req.header("X-CSRF-Token");
  const csrfSession = (req.session as any).csrfToken;
  if (!csrfHeader || csrfHeader !== csrfSession) {
    return res.status(403).json({ error: "invalid CSRF token" });
  }
  res.json({ ok: true });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(PORT, () => {
  console.log(`Sample app running at http://localhost:${PORT}`);
});
