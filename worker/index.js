// The Cloudflare Worker behind the site. It does two things:
//
//   fetch      serves the built site (the dist/ folder) exactly as before.
//   scheduled  wakes every hour on the timer in wrangler.jsonc and, at the hours
//              listed in REFRESH_HOURS (Mountain time), presses "Run workflow" on
//              the "Refresh FRED data" GitHub Action. GitHub's own schedules have
//              proved unreliable for this repository. Checking the hour here,
//              rather than in the cron, keeps the runs at the same local times
//              through daylight saving changes.
//
// It needs one secret, GITHUB_TOKEN: a fine-grained GitHub token limited to this
// repository with "Actions: Read and write". Add it in the Cloudflare dashboard
// under the Worker's Settings > Variables and Secrets.

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    const hour = localHour(event.scheduledTime, env.TIME_ZONE || 'America/Denver');
    const hours = String(env.REFRESH_HOURS || '6,9,12,15,18,21').split(',').map(h => Number(h.trim()));
    if (!hours.includes(hour)) return;
    ctx.waitUntil(runRefresh(env));
  },
};

/** The hour (0-23) on the wall clock in the given time zone. */
function localHour(ms, timeZone) {
  const h = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', hourCycle: 'h23' }).format(new Date(ms));
  return Number(h);
}

async function runRefresh(env) {
  if (!env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN secret is not set; add it under Settings > Variables and Secrets.');
  const api = env.GITHUB_API || 'https://api.github.com';
  const url = `${api}/repos/${env.GITHUB_REPO}/actions/workflows/${env.GITHUB_WORKFLOW || 'fred.yml'}/dispatches`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.GITHUB_TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'macro-dashboard-timer',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ref: env.GITHUB_BRANCH || 'main' }),
  });
  // GitHub answers 204 No Content when the run has been queued.
  if (res.status !== 204) throw new Error(`GitHub did not start the refresh: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  console.log('Refresh FRED data: run requested');
}
