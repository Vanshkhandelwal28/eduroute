# Skill Trend — Student Skill Profile

Unified skill template used by Skill Trend Analysis:

| Source | Where it comes from |
|--------|---------------------|
| Onboarding strengths | Skill-gap quiz answers = yes |
| Onboarding gaps | Skill-gap quiz answers = no / missingSkills |
| CV | Parsed CV skills in `cvStore` |
| Certificates | Earned course skills in `courseAchievementsStore` |

## Live collect on Refresh

When the student clicks **Refresh analysis**, the client sends `liveCollect: true` to `/api/market-trends` (`analyze_student`). The server:

1. Collects Adzuna + data.gov.in + curated jobs for the selected region
2. Computes demand grounded on those jobs
3. Runs Groq/Gemini with the full student template
4. Returns jobs so the client can persist them for demand bars

Env: `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `GROQ_API_KEY` / `GEMINI_API_KEY`.
