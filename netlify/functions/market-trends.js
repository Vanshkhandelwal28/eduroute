/**
 * Market trends + Skill Market Trend Engine
 * Actions: refresh_market | analyze_student | collect_jobs | list_jobs
 * Job pipeline: Adzuna (multi-page) + data.gov.in + curated → demand → AI
 */
const shared = require('./_lib/marketShared');
const collect = require('./_lib/marketCollect');
const demand = require('./_lib/marketDemand');

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
        if (demandRows.length) {
          market.risingSkills = demandRows.slice(0, 6).map(function (d) {
            return {
              skill: d.skill,
              demandScore: Math.min(95, 50 + Math.round(d.demandPct)),
              trend: 'rising',
              note: d.jobCount + ' jobs (' + d.demandPct + '%)',
            };
          });
          market.jobCount = jobsForAi.length;
          market.demandTop = demandRows.slice(0, 8);
          market.sourcesNote =
            'Demand from ' +
            jobsForAi.length +
            ' collected jobs ' +
            JSON.stringify(demand.sourceCounts(jobsForAi)) +
            (errMsg ? ' (' + errMsg + ')' : '');
        }
        return market;
      };

      if (!shared.env('GEMINI_API_KEY') && !shared.env('GROQ_API_KEY')) {
        const market = applyDemandFallback(demand.localMarketFallback(region), 'no AI keys');
        demand.setMemoryMarket(market);
        return shared.json(200, {
          ok: true,
          market: market,
          provider: 'local-fallback',
          demandFromJobs: demandRows.slice(0, 12),
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
          });
        }
        out.parsed.updatedAt = out.parsed.updatedAt || new Date().toISOString();
        if (!out.parsed.region) out.parsed.region = shared.regionField(region);
        out.parsed.provider = out.provider;
        out.parsed.jobCount = jobsForAi.length;
        if (!out.parsed.demandTop && demandRows.length) out.parsed.demandTop = demandRows.slice(0, 8);
        if (!out.parsed.sourcesNote) {
          out.parsed.sourcesNote =
            'Grounded on ' +
            jobsForAi.length +
            ' collected jobs: ' +
            JSON.stringify(demand.sourceCounts(jobsForAi));
        }
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
        });
      }
    }

    if (action === 'analyze_student') {
      const payload = {
        skills: Array.isArray(body.skills) ? body.skills : [],
        strengths: Array.isArray(body.strengths) ? body.strengths : [],
        gaps: Array.isArray(body.gaps) ? body.gaps : [],
        field: body.field || 'Software Engineering',
        interests: Array.isArray(body.interests) ? body.interests : [],
        region: region,
      };
      if (!shared.env('GEMINI_API_KEY') && !shared.env('GROQ_API_KEY')) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket() || demand.localMarketFallback(region),
          provider: 'local-fallback',
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
          });
        }
        out.parsed.generatedAt = out.parsed.generatedAt || new Date().toISOString();
        out.parsed.provider = out.provider;
        return shared.json(200, {
          ok: true,
          analysis: out.parsed,
          market: demand.getMemoryMarket(),
          provider: out.provider,
        });
      } catch (e) {
        return shared.json(200, {
          ok: true,
          analysis: demand.localStudentFallback(payload),
          market: demand.getMemoryMarket(),
          provider: 'local-fallback',
          warning: String(e.message || e).slice(0, 200),
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
