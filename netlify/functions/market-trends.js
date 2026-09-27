/**
 * Market trends + Skill Market Trend Engine
 * Actions: refresh_market | analyze_student | collect_jobs | list_jobs
 * Region-aware: rising / top roles / declining from jobs in selected state or India (All)
 */
const shared = require('./_lib/marketShared');
const collect = require('./_lib/marketCollect');
const demand = require('./_lib/marketDemand');

/** Ground rising + roles + sectors + declining on REGION-FILTERED jobs. */
function groundOnJobs(market, demandRows, jobs, govIndicators, region) {
  const scope = shared.normalizeRegion(region);
  if (demandRows && demandRows.length) {
    const maxPct = demandRows[0].demandPct || 1;
    market.risingSkills = demandRows.slice(0, 6).map(function (d) {
      return {
        skill: d.skill,
        demandScore: Math.min(95, Math.round(40 + (d.demandPct / maxPct) * 55)),
        trend: 'rising',
        note: d.jobCount + ' jobs · ' + d.demandPct + '% in ' + scope,
      };
    });
    market.demandTop = demandRows.slice(0, 10);
  }
  const roles = demand.rolesFromJobs(jobs || []);
  if (roles.length) {
    market.topRoles = roles.slice(0, 5).map(function (r) {
      return {
        role: r.role,
        openingsIndex: r.openingsIndex,
        avgSalaryLpa: r.avgSalaryLpa,
        jobCount: r.jobCount,
      };
    });
  }
  const sectors = demand.sectorsFromJobs(jobs || []);
  if (sectors.length) market.sectors = sectors.slice(0, 5);

  if (!market.decliningSkills || !market.decliningSkills.length) {
    market.decliningSkills = [
      { skill: 'jQuery-only stacks', demandScore: 28, trend: 'declining', note: 'Legacy · ' + scope },
      { skill: 'Flash / outdated UI', demandScore: 12, trend: 'declining', note: 'Legacy · ' + scope },
    ];
  } else {
    market.decliningSkills = market.decliningSkills.slice(0, 3).map(function (d) {
      return {
        skill: d.skill,
        demandScore: d.demandScore || 25,
        trend: 'declining',
        note: (d.note || 'Low demand') + ' · ' + scope,
      };
    });
  }

  market.region = shared.regionField(scope);
  market.jobCount = (jobs && jobs.length) || market.jobCount || 0;
  const src = demand.sourceCounts(jobs || []);
  market.sourcesNote =
    scope +
    ' — utilised ' +
    market.jobCount +
    ' jobs: ' +
    JSON.stringify(src) +
    (govIndicators && govIndicators.length
      ? ' + ' + govIndicators.length + ' gov/PLFS'
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
        const regionJobs = shared.jobsForRegion(result.jobs, region);
        return shared.json(200, {
          ok: true,
          jobs: result.jobs,
          run: result.run,
          sources: result.sources,
          note: result.note,
          govIndicators: result.govIndicators || [],
          sourceCounts: demand.sourceCounts(result.jobs),
          demandTop: demand.demandFromJobs(regionJobs).slice(0, 12),
          topRoles: demand.rolesFromJobs(regionJobs).slice(0, 5),
          sectors: demand.sectorsFromJobs(regionJobs).slice(0, 5),
          regionJobCount: regionJobs.length,
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
      const allJobs =
        Array.isArray(body.existingJobs) && body.existingJobs.length
          ? body.existingJobs
          : collect.getMemoryJobs() || [];
      const jobsForAi = shared.jobsForRegion(allJobs, region);
      const govAll = Array.isArray(body.govIndicators) ? body.govIndicators : [];
      const govInd = shared.govForRegion(govAll, region);
      const demandRows = demand.demandFromJobs(jobsForAi);
      const prompt =
        jobsForAi.length > 0
          ? demand.marketTemplateFromJobs(region, jobsForAi, govInd)
          : demand.marketTemplate(region);

      const applyDemandFallback = function (market, errMsg) {
        const m = groundOnJobs(market, demandRows, jobsForAi, govInd, region);
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
          regionJobCount: jobsForAi.length,
        });
      }

      try {
        const out = await demand.aiJson(
          [
            { role: 'system', content: 'You output only one JSON object. No markdown. All skills/roles MUST match the region-specific data in the prompt.' },
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
            regionJobCount: jobsForAi.length,
          });
        }
        out.parsed.updatedAt = out.parsed.updatedAt || new Date().toISOString();
        out.parsed.provider = out.provider;
        groundOnJobs(out.parsed, demandRows, jobsForAi, govInd, region);
        demand.setMemoryMarket(out.parsed);
        return shared.json(200, {
          ok: true,
          market: out.parsed,
          provider: out.provider,
          demandFromJobs: demandRows.slice(0, 12),
          sourcesUsed: demand.sourceCounts(jobsForAi),
          regionJobCount: jobsForAi.length,
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
          regionJobCount: jobsForAi.length,
        });
      }
    }

    if (action === 'analyze_student') {
      // Live path: optionally collect Adzuna + data.gov + curated for the selected region
      // so Refresh is not limited to stale localStorage / seed jobs.
      let allJobs =
        Array.isArray(body.existingJobs) && body.existingJobs.length
          ? body.existingJobs
          : collect.getMemoryJobs() || [];
      let collectNote = '';
      let collectSources = [];
      const needLive =
        body.liveCollect === true ||
        !allJobs.length ||
        !allJobs.some(function (j) {
          return j && j.source === 'adzuna';
        });
      if (needLive) {
        try {
          const collected = await collect.collectJobsPayload(allJobs, region);
          allJobs = collected.jobs || allJobs;
          collectNote = collected.note || '';
          collectSources = collected.sources || [];
          collect.setMemoryJobs(allJobs);
        } catch (ce) {
          collectNote = 'Collect skipped: ' + String(ce.message || ce).slice(0, 100);
        }
      }
      const jobsForStudent = shared.jobsForRegion(allJobs, region);
      const demandRows = demand.demandFromJobs(jobsForStudent).slice(0, 12);
      const demandHint = demandRows
        .map(function (d) {
          return d.skill + ':' + d.demandPct + '%(' + d.jobCount + ')';
        })
        .join(',');
      const srcCounts = demand.sourceCounts(jobsForStudent);
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
        region: region,
        demandHint: demandHint,
        jobCount: jobsForStudent.length,
        sources: srcCounts,
      };
      if (!shared.env('GEMINI_API_KEY') && !shared.env('GROQ_API_KEY')) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket() || demand.localMarketFallback(region),
          provider: 'local-fallback',
          demandFromJobs: demandRows,
          jobs: allJobs,
          collectNote: collectNote,
          sourcesUsed: srcCounts,
          regionJobCount: jobsForStudent.length,
        });
      }
      try {
        const out = await demand.aiJson(
          [
            {
              role: 'system',
              content:
                'You are a career market analyst for Indian students. Output only one JSON object. No markdown. Ground every skill gap and recommendation in the LiveDemand and job counts provided.',
            },
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
            jobs: allJobs,
            collectNote: collectNote,
            sourcesUsed: srcCounts,
            regionJobCount: jobsForStudent.length,
            warning: 'AI non-JSON',
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
          jobs: allJobs,
          collectNote: collectNote,
          sourcesUsed: srcCounts,
          regionJobCount: jobsForStudent.length,
        });
      } catch (e) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket(),
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
          demandFromJobs: demandRows,
          jobs: allJobs,
          collectNote: collectNote,
          sourcesUsed: srcCounts,
          regionJobCount: jobsForStudent.length,
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
