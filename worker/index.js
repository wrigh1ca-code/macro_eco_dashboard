// The Cloudflare Worker behind the site. It does two things:
//
//   fetch      serves the built site (the dist/ folder) exactly as before.
//   scheduled  runs on the timer in wrangler.jsonc and presses "Run workflow"
//              on the "Refresh FRED data" GitHub Action, because GitHub's own
//              schedules have proved unreliable for this repository.
//
// It needs one secret, GITHUB_TOKEN: a fine-grained GitHub token limited to this
// repository with "Actions: Read and write". Add it in the Cloudflare dashboard
// under the Worker's Settings > Variables and Secrets.

export default {
  async fetch(request, env) {
    return env.ASSETS.fetch(request);
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(runRefresh(env));
  },
};

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
