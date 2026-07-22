const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { runScraper } = require('./scraper');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'wb-job-portal-secret-change-me',
  resave: false,
  saveUninitialized: false
}));

// ---------- Auth middleware ----------
function requireLogin(req, res, next) {
  if (req.session && req.session.loggedIn) return next();
  return res.redirect('/admin/login');
}

// ---------- PUBLIC ROUTES ----------

// Home / job listing with search + filter
app.get('/', (req, res) => {
  const { q, district, category } = req.query;
  let jobs = db.get('jobs').value();

  if (q) {
    const term = q.toLowerCase();
    jobs = jobs.filter(j =>
      j.title.toLowerCase().includes(term) ||
      j.company.toLowerCase().includes(term)
    );
  }
  if (district) jobs = jobs.filter(j => j.district === district);
  if (category) jobs = jobs.filter(j => j.category === category);

  // Sort newest first
  jobs = [...jobs].sort((a, b) => new Date(b.postedDate) - new Date(a.postedDate));

  const districts = [...new Set(db.get('jobs').value().map(j => j.district))].sort();
  const categories = [...new Set(db.get('jobs').value().map(j => j.category))].sort();

  res.render('index', { jobs, districts, categories, q, district, category });
});

app.get('/job/:id', (req, res) => {
  const job = db.get('jobs').find({ id: parseInt(req.params.id) }).value();
  if (!job) return res.status(404).send('Job not found');
  res.render('job', { job });
});

// ---------- ADMIN AUTH ----------

app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const { username, password } = req.body;
  const admin = db.get('admin').value();
  if (username === admin.username && bcrypt.compareSync(password, admin.passwordHash)) {
    req.session.loggedIn = true;
    return res.redirect('/admin');
  }
  res.render('admin/login', { error: 'ভুল username অথবা password।' });
});

app.get('/admin/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

// ---------- ADMIN DASHBOARD ----------

app.get('/admin', requireLogin, (req, res) => {
  const jobs = db.get('jobs').value();
  const sources = db.get('sources').value();
  res.render('admin/dashboard', { jobs, sources, message: req.query.message || null });
});

// Add job form
app.get('/admin/jobs/new', requireLogin, (req, res) => {
  res.render('admin/edit', { job: null });
});

app.post('/admin/jobs/new', requireLogin, (req, res) => {
  const jobs = db.get('jobs');
  const newId = jobs.value().length ? Math.max(...jobs.value().map(j => j.id)) + 1 : 1;
  const job = { id: newId, ...req.body, postedDate: req.body.postedDate || new Date().toISOString().slice(0, 10) };
  jobs.push(job).write();
  res.redirect('/admin?message=Job added successfully');
});

// Edit job
app.get('/admin/jobs/:id/edit', requireLogin, (req, res) => {
  const job = db.get('jobs').find({ id: parseInt(req.params.id) }).value();
  if (!job) return res.status(404).send('Job not found');
  res.render('admin/edit', { job });
});

app.post('/admin/jobs/:id/edit', requireLogin, (req, res) => {
  db.get('jobs').find({ id: parseInt(req.params.id) }).assign(req.body).write();
  res.redirect('/admin?message=Job updated successfully');
});

// Delete job
app.post('/admin/jobs/:id/delete', requireLogin, (req, res) => {
  db.get('jobs').remove({ id: parseInt(req.params.id) }).write();
  res.redirect('/admin?message=Job deleted');
});

// ---------- SOURCES (for scraper) ----------

app.post('/admin/sources/new', requireLogin, (req, res) => {
  const sources = db.get('sources');
  const newId = sources.value().length ? Math.max(...sources.value().map(s => s.id)) + 1 : 1;
  sources.push({ id: newId, ...req.body, active: true }).write();
  res.redirect('/admin?message=Source added');
});

app.post('/admin/sources/:id/delete', requireLogin, (req, res) => {
  db.get('sources').remove({ id: parseInt(req.params.id) }).write();
  res.redirect('/admin?message=Source removed');
});

// Trigger scraper manually
app.post('/admin/scrape', requireLogin, async (req, res) => {
  try {
    const sources = db.get('sources').filter({ active: true }).value();
    const results = await runScraper(sources);

    const jobs = db.get('jobs');
    let added = 0;
    results.forEach(job => {
      const exists = jobs.find({ title: job.title, company: job.company }).value();
      if (!exists) {
        const newId = jobs.value().length ? Math.max(...jobs.value().map(j => j.id)) + 1 : 1;
        jobs.push({ id: newId, ...job }).write();
        added++;
      }
    });

    res.redirect(`/admin?message=Scraper finished. ${added} new job(s) added.`);
  } catch (err) {
    console.error(err);
    res.redirect('/admin?message=Scraper error: ' + encodeURIComponent(err.message));
  }
});

app.listen(PORT, () => {
  console.log(`WB Job Portal running on http://localhost:${PORT}`);
});
