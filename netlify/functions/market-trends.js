/**
 * Market trends + Skill Market Trend Engine
 * Actions: refresh_market | analyze_student | collect_jobs | list_jobs
 * Job pipeline: Adzuna + data.gov.in + curated → full demand utilisation → AI
 */
const shared = require('./_lib/marketShared');
const collect = require('./_lib/marketCollect');
const demand = require('./_lib/marketDemand');

/** Ground rising + roles + sectors on ALL collected jobs. */
function groundOnJobs(market, demandRows, jobs, govIndicators) {
  if (demandRows && demandRows.length) {
    const maxPct = demandRows[0].demandPct || 1;
    market.risingSkills = demandRows.slice(0, 6).map(function (d) {
      return {
        skill: d.skill,
        demandScore: Math.min(95, Math.round(40 + (d.demandPct / maxPct) * 55)),
        trend: 'rising',
        note: d.jobCount + ' jobs · ' + d.demandPct + '% share',
      };
    });
    market.demandTop = demandRows.slice(0, 10);
  }
  const roles = demand.rolesFromJobs(jobs || []);
  if (roles.length) market.topRoles = roles.slice(0, 5);
  const sectors = demand.sectorsFromJobs(jobs || []);
  if (sectors.length) market.sectors = sectors.slice(0, 5);
  market.jobCount = (jobs && jobs.length) || market.jobCount || 0;
  const src = demand.sourceCounts(jobs || []);
  market.sourcesNote =
    'Utilised ' +
    market.jobCount +
    ' jobs: ' +
    JSON.stringify(src) +
    (govIndicators && govIndicators.length
      ? ' + ' + govIndicators.length + ' gov/PLFS indicators'
      : '');
  if (govIndicators && govIndicators.length) {
    market.govIndicators = govIndicators.slice(0, 12);
  }
  return market;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return shared.json(200, { ok: true });

  if (event.httpMethod === 'GET') {
    return shared.json(200, {
      ok: true,
      market: demand.getMemoryMarket(),
      jobsCount: (collect.getMemoryJobs() || []).length,
      hasGemini: Boolean(shared.env('GEMINI_API_KEY')),
      hasGroq: Boolean(shared.env('GROQ_API_KEY')),
      hasAdzuna: shared.hasAdzuna(),
      hasDataGov: shared.hasDataGov(),
      sources: [
        { code: 'curated-public', name: 'Curated public demo postings', permitted: true },
        { code: 'adzuna', name: 'Adzuna Jobs API (India)', permitted: true, configured: shared.hasAdzuna() },
        { code: 'data-gov-in', name: 'data.gov.in (Skill India + PLFS)', permitted: true, configured: shared.hasDataGov() },
      ],
    });
  }

  if (event.httpMethod !== 'POST') {
    return shared.json(405, { ok: false, error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action || 'refresh_market';
    const region = shared.normalizeRegion(body.region || 'Maharashtra');

    if (action === 'collect_jobs') {
      try {
        const result = await collect.collectJobsPayload(body.existingJobs, region);
        return shared.json(200, {
          ok: true,
          jobs: result.jobs,
          run: result.run,
          sources: result.sources,
          note: result.note,
          govIndicators: result.govIndicators || [],
          sourceCounts: demand.sourceCounts(result.jobs),
          demandTop: demand.demandFromJobs(result.jobs).slice(0, 12),
          topRoles: demand.rolesFromJobs(result.jobs).slice(0, 5),
          sectors: demand.sectorsFromJobs(result.jobs).slice(0, 5),
        });
      } catch (e) {
        return shared.json(200, {
          ok: true,
          jobs: collect.getMemoryJobs() || [],
          run: {
            id: 'run-err-' + Date.now(),
            startedAt: new Date().toISOString(),
            finishedAt: new Date().toISOString(),
            status: 'error',
            source: 'error',
            jobsFetched: 0,
            jobsInserted: 0,
            jobsDuplicate: 0,
            errorMessage: String(e.message || e).slice(0, 200),
          },
          note: 'Collect failed: ' + String(e.message || e).slice(0, 120),
        });
      }
    }

    if (action === 'list_jobs') {
      return shared.json(200, { ok: true, jobs: collect.getMemoryJobs() || [] });
    }

    if (action === 'refresh_market') {
      const jobsForAi =
        Array.isArray(body.existingJobs) && body.existingJobs.length
          ? body.existingJobs
          : collect.getMemoryJobs() || [];
      const govInd = Array.isArray(body.govIndicators) ? body.govIndicators : [];
      const demandRows = demand.demandFromJobs(jobsForAi);
      const prompt =
        jobsForAi.length > 0
          ? demand.marketTemplateFromJobs(region, jobsForAi, govInd)
          : demand.marketTemplate(region);

      const applyDemandFallback = function (market, errMsg) {
        const m = groundOnJobs(market, demandRows, jobsForAi, govInd);
        if (errMsg) m.sourcesNote = (m.sourcesNote || '') + ' (' + errMsg + ')';
        return m;
      };

      if (!shared.env('GEMINI_API_KEY') && !shared.env('GROQ_API_KEY')) {
        const market = applyDemandFallback(demand.localMarketFallback(region), 'no AI keys');
        demand.setMemoryMarket(market);
        return shared.json(200, {
          ok: true,
          market: market,
          provider: 'local-fallback',
          demandFromJobs: demandRows.slice(0, 12),
          sourcesUsed: demand.sourceCounts(jobsForAi),
        });
      }

      try {
        const out = await demand.aiJson(
          [
            { role: 'system', content: 'You output only one JSON object. No markdown.' },
            { role: 'user', content: prompt },
          ],
          0.35,
        );
        if (!out.parsed) {
          const market = applyDemandFallback(demand.localMarketFallback(region), 'AI non-JSON');
          demand.setMemoryMarket(market);
          return shared.json(200, {
            ok: true,
            market: market,
            provider: 'local-fallback',
            warning: 'AI non-JSON',
            demandFromJobs: demandRows.slice(0, 12),
            sourcesUsed: demand.sourceCounts(jobsForAi),
          });
        }
        out.parsed.updatedAt = out.parsed.updatedAt || new Date().toISOString();
        if (!out.parsed.region) out.parsed.region = shared.regionField(region);
        out.parsed.provider = out.provider;
        // Always ground rising/roles/sectors on real collected data so nothing is wasted
        groundOnJobs(out.parsed, demandRows, jobsForAi, govInd);
        demand.setMemoryMarket(out.parsed);
        return shared.json(200, {
          ok: true,
          market: out.parsed,
          provider: out.provider,
          demandFromJobs: demandRows.slice(0, 12),
          sourcesUsed: demand.sourceCounts(jobsForAi),
        });
      } catch (e) {
        const market = applyDemandFallback(
          demand.localMarketFallback(region),
          String(e.message || e).slice(0, 80),
        );
        demand.setMemoryMarket(market);
        return shared.json(200, {
          ok: true,
          market: market,
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
          demandFromJobs: demandRows.slice(0, 12),
          sourcesUsed: demand.sourceCounts(jobsForAi),
        });
      }
    }

    if (action === 'analyze_student') {
      const jobsForStudent =
        Array.isArray(body.existingJobs) && body.existingJobs.length
          ? body.existingJobs
          : collect.getMemoryJobs() || [];
      const demandRows = demand.demandFromJobs(jobsForStudent).slice(0, 12);
      const demandHint = demandRows
        .map(function (d) {
          return d.skill + ':' + d.demandPct + '%';
        })
        .join(',');
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
        region: region,
        demandHint: demandHint,
      };
      if (!shared.env('GEMINI_API_KEY') && !shared.env('GROQ_API_KEY')) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket() || demand.localMarketFallback(region),
          provider: 'local-fallback',
          demandFromJobs: demandRows,
        });
      }
      try {
        const out = await demand.aiJson(
          [
            { role: 'system', content: 'You output only one JSON object. No markdown.' },
            { role: 'user', content: demand.studentTemplate(payload) },
          ],
          0.4,
        );
        if (!out.parsed) {
          return shared.json(200, {
            ok: true,
            analysis: demand.localStudentFallback(payload),
            market: demand.getMemoryMarket(),
            provider: 'local-fallback',
            demandFromJobs: demandRows,
          });
        }
        out.parsed.generatedAt = out.parsed.generatedAt || new Date().toISOString();
        out.parsed.provider = out.provider;
        return shared.json(200, {
          ok: true,
          analysis: out.parsed,
          market: demand.getMemoryMarket(),
          provider: out.provider,
          demandFromJobs: demandRows,
        });
      } catch (e) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket(),
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
          demandFromJobs: demandRows,
        });
      }
    }

    return shared.json(400, {
      ok: false,
      error: 'Unknown action. Use refresh_market, analyze_student, collect_jobs, list_jobs.',
    });
  } catch (err) {
    return shared.json(500, { ok: false, error: err.message || 'Market trends failed' });
  }
};
