/**
 * scraper.js
 * -----------
 * Pulls job listings from each active "source" website and normalizes
 * them into the job object shape used by this app:
 *   { title, company, district, location, category, vacancies,
 *     qualification, salary, postedDate, source, sourceUrl, applyUrl, description }
 *
 * IMPORTANT:
 * Every job site structures its HTML differently, so there is no single
 * selector that works everywhere. Below is a generic best-effort parser
 * plus a per-source override map. When you point this at a real site,
 * inspect that site's HTML (view-source / devtools) and add a custom
 * parser function for it in `customParsers`.
 *
 * In THIS sandbox, outbound network access is restricted to a small
 * allow-list (npm, github, etc.) and does NOT include arbitrary job
 * sites. So live fetches here will fail — that's expected. When you
 * deploy this app on your own server/hosting (with normal internet
 * access), the axios requests below will work against the real sites.
 * A demo fallback is included so you can see the full flow working
 * end-to-end right now.
 */

const axios = require('axios');
const cheerio = require('cheerio');

// ---- Per-source custom parsers ----
// Add one entry per source name if the generic parser doesn't work well.
const customParsers = {
  // Example skeleton for a future real source:
  // 'Some Job Site': ($, sourceUrl) => {
  //   const jobs = [];
  //   $('.job-card').each((i, el) => {
  //     jobs.push({
  //       title: $(el).find('.job-title').text().trim(),
  //       company: $(el).find('.company-name').text().trim(),
  //       location: $(el).find('.location').text().trim(),
  //       applyUrl: $(el).find('a.apply-link').attr('href') || sourceUrl,
  //     });
  //   });
  //   return jobs;
  // },
};

// Generic fallback: looks for common patterns (list items / cards with
// a heading + link). Works on some sites, not all — customize as needed.
function genericParse($, sourceUrl) {
  const jobs = [];
  $('li, .card, .job, .vacancy').each((i, el) => {
    const heading = $(el).find('h1,h2,h3,h4,strong').first().text().trim();
    const link = $(el).find('a').first().attr('href');
    if (heading && heading.length > 3 && heading.length < 120) {
      jobs.push({
        title: heading,
        company: '',
        location: '',
        applyUrl: link ? new URL(link, sourceUrl).href : sourceUrl,
      });
    }
  });
  return jobs;
}

async function scrapeSource(source) {
  try {
    const { data } = await axios.get(source.url, { timeout: 8000 });
    const $ = cheerio.load(data);
    const parser = customParsers[source.name] || genericParse;
    const rawJobs = parser($, source.url);

    return rawJobs.map(j => ({
      title: j.title || 'Untitled position',
      company: j.company || source.name,
      district: source.district || 'West Bengal',
      location: j.location || '',
      category: j.category || 'General',
      vacancies: j.vacancies || '',
      qualification: j.qualification || '',
      salary: j.salary || '',
      postedDate: new Date().toISOString().slice(0, 10),
      source: source.name,
      sourceUrl: source.url,
      applyUrl: j.applyUrl || source.url,
      description: j.description || `Sourced automatically from ${source.name}.`,
    }));
  } catch (err) {
    // Network blocked in this sandbox, or site unreachable/changed structure.
    console.warn(`[scraper] Could not fetch ${source.name} (${source.url}): ${err.message}`);
    return null; // signal failure so caller can decide on fallback
  }
}

// Demo fallback data so the admin can see the pipeline work end-to-end
// while testing inside this sandbox (no outbound access to job sites).
function demoFallback(source) {
  return [{
    title: `Sample Vacancy (auto-fetched demo) - ${source.name}`,
    company: source.name,
    district: source.district || 'West Bengal',
    location: '',
    category: 'General',
    vacancies: '',
    qualification: '',
    salary: '',
    postedDate: new Date().toISOString().slice(0, 10),
    source: source.name,
    sourceUrl: source.url,
    applyUrl: source.url,
    description: 'This is placeholder data — live scraping was not reachable from this environment. On your real server, this will be replaced by actual scraped listings.',
  }];
}

async function runScraper(sources) {
  let allJobs = [];
  for (const source of sources) {
    let jobs = await scrapeSource(source);
    if (!jobs || jobs.length === 0) {
      jobs = demoFallback(source);
    }
    allJobs = allJobs.concat(jobs);
  }
  return allJobs;
}

module.exports = { runScraper, scrapeSource };
