
/**
 * Leadzzz (ليدززز) - Dev Reference Backend
 * Node.js built-in http server (no dependencies) for local dev + contract demo.
 *
 * Run:
 *   cd backend
 *   node server.js
 *
 * Env:
 *   PORT=8787
 *   ALLOWED_ORIGINS=*   (comma-separated or '*')
 *   DEV_EMAIL=admin@leadz.local
 *   DEV_PASSWORD=123456
 */
const http = require("http");
const url = require("url");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "8787", 10);
const DATA_FILE = path.join(__dirname, "data.json");

const DEV_EMAIL = process.env.DEV_EMAIL || "admin@leadz.local";
const DEV_PASSWORD = process.env.DEV_PASSWORD || "123456";

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

function readJsonFile() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return { jobs: {}, people: {}, companies: {}, activity: [], whatsapp: [] };
  }
}
function writeJsonFile(db) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}
let db = readJsonFile();

function nowIso() { return new Date().toISOString(); }
function uuid() { return crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString("hex"); }

function json(res, status, obj, extraHeaders = {}) {
  const body = JSON.stringify(obj);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    ...extraHeaders,
  });
  res.end(body);
}

function cors(req) {
  const origin = req.headers.origin || "";
  // If ALLOWED_ORIGINS is '*' -> allow any origin (dev).
  if (ALLOWED_ORIGINS.length === 1 && ALLOWED_ORIGINS[0] === "*") {
    return {
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Vary": "Origin",
    };
  }
  // Otherwise allowlist
  if (ALLOWED_ORIGINS.includes(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Credentials": "true",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Vary": "Origin",
    };
  }
  // No CORS for unknown origins
  return {
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Vary": "Origin",
  };
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 2_000_000) { // 2MB
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function getToken(req) {
  const auth = req.headers.authorization || "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim();
}
function requireAuth(req, res) {
  const token = getToken(req);
  if (!token || token !== db._devToken) {
    json(res, 401, { error: "Unauthorized" }, cors(req));
    return null;
  }
  return { userId: "u_admin", email: DEV_EMAIL, role: "admin" };
}

function logActivity(kind, payload) {
  const item = { id: uuid(), at: nowIso(), kind, ...payload };
  db.activity.unshift(item);
  db.activity = db.activity.slice(0, 2000);
  writeJsonFile(db);
  return item;
}

function classifyUrl(inputUrl) {
  try {
    const u = new URL(inputUrl);
    const host = (u.hostname || "").toLowerCase();
    const pathn = (u.pathname || "");
    if (host.includes("linkedin.com")) {
      if (pathn.startsWith("/in/")) return { page_type: "linkedin_profile" };
      if (pathn.startsWith("/company/")) return { page_type: "linkedin_company" };
      return { page_type: "linkedin_other" };
    }
    return { page_type: "website" };
  } catch {
    return { page_type: "unknown" };
  }
}

function upsertEntityFromResolve(inputUrl) {
  const { page_type } = classifyUrl(inputUrl);
  const id = crypto.createHash("sha1").update(String(inputUrl)).digest("hex").slice(0, 10);
  if (page_type === "linkedin_profile") {
    const personId = `p_${id}`;
    const snapshot = {
      name: "غير مؤكد",
      title: "غير مؤكد",
      company: "غير مؤكد",
      source_url: inputUrl,
    };
    db.people[personId] = db.people[personId] || { id: personId, created_at: nowIso() };
    db.people[personId] = { ...db.people[personId], snapshot, updated_at: nowIso() };
    writeJsonFile(db);
    return { entity_type: "person", entity_id: personId, snapshot };
  }
  if (page_type === "linkedin_company") {
    const companyId = `c_${id}`;
    const snapshot = {
      name: "غير مؤكد",
      industry: "غير مؤكد",
      website: "غير مؤكد",
      source_url: inputUrl,
    };
    db.companies[companyId] = db.companies[companyId] || { id: companyId, created_at: nowIso() };
    db.companies[companyId] = { ...db.companies[companyId], snapshot, updated_at: nowIso() };
    writeJsonFile(db);
    return { entity_type: "company", entity_id: companyId, snapshot };
  }
  // website
  const companyId = `c_${id}`;
  const snapshot = {
    name: "غير مؤكد",
    industry: "غير مؤكد",
    website: (() => { try { return new URL(inputUrl).origin; } catch { return "غير مؤكد"; } })(),
    source_url: inputUrl,
  };
  db.companies[companyId] = db.companies[companyId] || { id: companyId, created_at: nowIso() };
  db.companies[companyId] = { ...db.companies[companyId], snapshot, updated_at: nowIso() };
  writeJsonFile(db);
  return { entity_type: "company", entity_id: companyId, snapshot };
}

function createJob(kind, meta) {
  const jobId = `j_${uuid()}`;
  const job = {
    id: jobId,
    kind,
    status: "queued",
    created_at: nowIso(),
    updated_at: nowIso(),
    progress: { step: 0, total: 3, message: "Queued" },
    meta: meta || {},
    result: null,
    error: null,
  };
  db.jobs[jobId] = job;
  writeJsonFile(db);
  return job;
}

function completeJob(jobId, result) {
  const job = db.jobs[jobId];
  if (!job) return;
  job.status = "success";
  job.updated_at = nowIso();
  job.progress = { step: 3, total: 3, message: "Done" };
  job.result = result;
  writeJsonFile(db);
}

function failJob(jobId, message) {
  const job = db.jobs[jobId];
  if (!job) return;
  job.status = "failed";
  job.updated_at = nowIso();
  job.error = { message: String(message || "Unknown error") };
  job.progress = { step: job.progress?.step || 0, total: job.progress?.total || 3, message: "Failed" };
  writeJsonFile(db);
}

function runSurvey(kind, entityType, entityId) {
  const job = createJob(kind, { entityType, entityId });
  // Demo: complete quickly with fake evidence/report
  const evidence = [
    { id: uuid(), type: "source", title: "Website / Social", url: "غير مؤكد", snippet: "لم يتم تشغيل موفّر حقيقي بعد (Demo)." },
    { id: uuid(), type: "maps", title: "Google Maps", url: "غير مؤكد", snippet: "لم يتم تشغيل موفّر حقيقي بعد (Demo)." },
  ];
  const report = {
    id: uuid(),
    created_at: nowIso(),
    summary: "تقرير تجريبي (Demo) — يُستبدل لاحقًا بتقرير LLM مبني على Evidence حقيقية.",
    sections: [
      { title: "لمحة سريعة", bullets: ["النشاط: غير مؤكد", "المدينة: غير مؤكد", "أقوى فرصة: غير مؤكد"] },
      { title: "اقتراح عرض مناسب", bullets: ["إدارة حسابات + إعلانات ممولة + SEO/AIO", "CTA: احجز مكالمة 10 دقائق"] },
      { title: "الأدلة", bullets: ["لا توجد أدلة مؤكدة — Demo فقط"] },
    ],
  };

  // Attach to entity
  if (entityType === "person") {
    db.people[entityId] = db.people[entityId] || { id: entityId, created_at: nowIso() };
    db.people[entityId].evidence = evidence;
    db.people[entityId].report = report;
    db.people[entityId].updated_at = nowIso();
  } else {
    db.companies[entityId] = db.companies[entityId] || { id: entityId, created_at: nowIso() };
    db.companies[entityId].evidence = evidence;
    db.companies[entityId].report = report;
    db.companies[entityId].updated_at = nowIso();
  }
  writeJsonFile(db);

  completeJob(job.id, { entityType, entityId, evidenceCount: evidence.length, reportId: report.id });
  logActivity("survey_done", { entityType, entityId, jobId: job.id });
  return job;
}

function sendWhatsApp(payload) {
  const job = createJob("whatsapp_send", payload || {});
  // Demo success
  const msg = {
    id: uuid(),
    at: nowIso(),
    to: payload?.to || "غير مؤكد",
    text: payload?.text || "",
    entityType: payload?.entityType || "unknown",
    entityId: payload?.entityId || "unknown",
    status: "sent_demo",
  };
  db.whatsapp.unshift(msg);
  writeJsonFile(db);
  completeJob(job.id, { messageId: msg.id, status: msg.status });
  logActivity("whatsapp_sent", { entityType: msg.entityType, entityId: msg.entityId, jobId: job.id, to: msg.to });
  return job;
}

const server = http.createServer(async (req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname || "/";
  const method = req.method || "GET";

  // Preflight
  if (method === "OPTIONS") {
    res.writeHead(204, cors(req));
    return res.end();
  }

  // health
  if (method === "GET" && pathname === "/health") {
    return json(res, 200, { ok: true, name: "leadz-backend", time: nowIso() }, cors(req));
  }

  // login
  if (method === "POST" && pathname === "/auth/login") {
    try {
      const body = JSON.parse(await readBody(req) || "{}");
      if (body.email === DEV_EMAIL && body.password === DEV_PASSWORD) {
        db._devToken = crypto.randomBytes(24).toString("hex");
        writeJsonFile(db);
        logActivity("login", { email: body.email });
        return json(res, 200, { token: db._devToken, user: { email: DEV_EMAIL, role: "admin" } }, cors(req));
      }
      return json(res, 401, { error: "Invalid credentials" }, cors(req));
    } catch (e) {
      return json(res, 400, { error: "Bad request", details: e.message }, cors(req));
    }
  }

  // auth required from here
  const user = requireAuth(req, res);
  if (!user) return;

  // /me
  if (method === "GET" && pathname === "/me") {
    return json(res, 200, { user }, cors(req));
  }

  // resolve
  if (method === "POST" && pathname === "/resolve") {
    try {
      const body = JSON.parse(await readBody(req) || "{}");
      const inputUrl = body.url || body.page_url || body.linkedin_url;
      if (!inputUrl) return json(res, 400, { error: "url is required" }, cors(req));
      const resolved = upsertEntityFromResolve(inputUrl);
      logActivity("resolve", { url: inputUrl, entityType: resolved.entity_type, entityId: resolved.entity_id });
      return json(res, 200, {
        ...resolved,
        page_type: classifyUrl(inputUrl).page_type,
        capabilities: { can_whatsapp: true, can_survey: true, can_reveal: false }
      }, cors(req));
    } catch (e) {
      return json(res, 400, { error: "Bad request", details: e.message }, cors(req));
    }
  }

  // jobs
  if (method === "GET" && pathname.startsWith("/jobs/")) {
    const jobId = pathname.split("/")[2];
    const job = db.jobs[jobId];
    if (!job) return json(res, 404, { error: "Job not found" }, cors(req));
    return json(res, 200, job, cors(req));
  }

  // people/company get
  if (method === "GET" && pathname.startsWith("/people/")) {
    const parts = pathname.split("/").filter(Boolean); // [people, id, ...]
    const id = parts[1];
    const person = db.people[id];
    if (!person) return json(res, 404, { error: "Person not found" }, cors(req));
    if (parts.length === 2) return json(res, 200, person, cors(req));
    if (parts[2] === "evidence") return json(res, 200, { evidence: person.evidence || [] }, cors(req));
    if (parts[2] === "report" && parts[3] === "latest") return json(res, 200, { report: person.report || null }, cors(req));
  }
  if (method === "GET" && pathname.startsWith("/companies/")) {
    const parts = pathname.split("/").filter(Boolean);
    const id = parts[1];
    const company = db.companies[id];
    if (!company) return json(res, 404, { error: "Company not found" }, cors(req));
    if (parts.length === 2) return json(res, 200, company, cors(req));
    if (parts[2] === "evidence") return json(res, 200, { evidence: company.evidence || [] }, cors(req));
    if (parts[2] === "report" && parts[3] === "latest") return json(res, 200, { report: company.report || null }, cors(req));
  }

  // survey
  if (method === "POST" && pathname.match(/^\/people\/[^/]+\/survey$/)) {
    const entityId = pathname.split("/")[2];
    return json(res, 200, runSurvey("survey_person", "person", entityId), cors(req));
  }
  if (method === "POST" && pathname.match(/^\/companies\/[^/]+\/survey$/)) {
    const entityId = pathname.split("/")[2];
    return json(res, 200, runSurvey("survey_company", "company", entityId), cors(req));
  }

  // whatsapp send
  if (method === "POST" && pathname === "/whatsapp/send") {
    try {
      const body = JSON.parse(await readBody(req) || "{}");
      if (!body.to || !body.text) return json(res, 400, { error: "to and text are required" }, cors(req));
      return json(res, 200, sendWhatsApp(body), cors(req));
    } catch (e) {
      return json(res, 400, { error: "Bad request", details: e.message }, cors(req));
    }
  }

  // activity
  if (method === "GET" && pathname === "/activity") {
    return json(res, 200, { activity: db.activity.slice(0, 200) }, cors(req));
  }

  // not found
  return json(res, 404, { error: "Not found", path: pathname }, cors(req));
});

server.listen(PORT, () => {
  console.log(`[leadz-backend] running on http://localhost:${PORT}`);
  console.log(`[leadz-backend] dev login: ${DEV_EMAIL} / ${DEV_PASSWORD}`);
});
