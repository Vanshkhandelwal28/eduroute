# Skill Trend Analysis — full profile (feat/skill-trend-full-profile)

## What changed
Student match score and gaps no longer depend only on the start skill-gap quiz.

### Skill template (every refresh)
1. **Onboarding quiz** — strengths (yes) + gaps (no / missingSkills)
2. **CV builder** — `skills` + certificate titles
3. **Course certificates** — skills from passed final assessments (`courseAchievementsStore`)
4. **Custom role** — `customSkills` / `customRole`
5. **State region** — existing Adzuna + data.gov.in + curated job pool

### Data sources (unchanged engine)
- Admin job pool: Adzuna API, data.gov.in, curated
- AI: `/api/market-trends` action `analyze_student` with full skills/strengths/gaps
- Local match always recomputed so the page is real on every refresh even if AI is offline

### Files
- `src/utils/studentSkillProfile.ts` — aggregator
- `src/pages/Intelligence/TrendAnalyse.tsx` — uses aggregator + skill sources UI
