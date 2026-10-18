import { mkdirSync, writeFileSync } from "node:fs";

const username = process.env.GITHUB_USER_NAME;
const token = process.env.GITHUB_TOKEN;
if (!username || !token) throw new Error("GITHUB_USER_NAME and GITHUB_TOKEN are required.");

const query = `query($login: String!) {
  user(login: $login) {
    contributionsCollection {
      contributionCalendar {
        weeks { contributionDays { date contributionLevel } }
      }
    }
  }
}`;
const response = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
  body: JSON.stringify({ query, variables: { login: username } }),
});
if (!response.ok) throw new Error(`GitHub GraphQL returned ${response.status}.`);
const result = await response.json();
if (result.errors?.length) throw new Error(result.errors.map(error => error.message).join("; "));
const weeks = result.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
if (!weeks?.length || weeks.some(week => !Array.isArray(week.contributionDays))) {
  throw new Error(`No contribution calendar found for ${username}.`);
}

const levelIndex = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
};
const escapeXml = value => value.replace(/[&<>"']/g, character => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;",
}[character]));

function render(dark) {
  const palette = dark
    ? ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"]
    : ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];
  const cell = 10;
  const step = 14;
  const padding = 12;
  const gridHeight = 7 * step - (step - cell);
  const width = padding * 2 + weeks.length * step - (step - cell);
  const railY = padding + gridHeight + 22;
  const height = railY + 10;
  const cells = weeks.map((week, column) => {
    const levels = Array(7).fill(0);
    for (const day of week.contributionDays) {
      const row = new Date(`${day.date}T00:00:00Z`).getUTCDay();
      levels[row] = levelIndex[day.contributionLevel] ?? 0;
    }
    return levels.map((level, row) =>
      `<rect x="${padding + column * step}" y="${padding + row * step}" width="${cell}" height="${cell}" rx="2" fill="${palette[level]}" />`,
    ).join("");
  }).join("");
  const ties = Array.from({ length: Math.floor(width / 12) }, (_, index) => {
    const x = index * 12 + 6;
    return `<path d="M${x} ${railY - 4}v8" stroke="${dark ? "#57606a" : "#b6bfc8"}" stroke-width="2" />`;
  }).join("");
  const wheels = [-38, -28, -13, -3, 4, 17].map(x =>
    `<circle cx="${x}" cy="-2" r="3.5" fill="${dark ? "#161b22" : "#ffffff"}" stroke="#d99b3d" stroke-width="1.5" />`,
  ).join("");
  const title = `${escapeXml(username)} GitHub contribution train`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title">
<title id="title">${title}</title>
<g>${cells}</g>
<path d="M0 ${railY}H${width}" stroke="${dark ? "#57606a" : "#b6bfc8"}" stroke-width="2" />
<g>${ties}</g>
<g>
  <animateTransform attributeName="transform" type="translate" from="-72 ${railY}" to="${width} ${railY}" dur="12s" repeatCount="indefinite" />
  <rect x="-42" y="-17" width="16" height="10" rx="2" fill="#6f9d88" />
  <rect x="-23" y="-17" width="16" height="10" rx="2" fill="#d99b3d" />
  <rect x="-5" y="-17" width="27" height="11" rx="2" fill="#8bae48" />
  <rect x="10" y="-25" width="12" height="19" rx="2" fill="#8bae48" />
  <rect x="5" y="-23" width="5" height="7" rx="1" fill="#d99b3d" />  <circle cx="4" cy="-29" r="2" fill="${dark ? "#aab2bd" : "#6b7280"}" opacity="0">
    <animate attributeName="r" values="2;5;8" dur="1.5s" repeatCount="indefinite" />
    <animate attributeName="opacity" values="0;0.55;0" dur="1.5s" repeatCount="indefinite" />
  </circle>
  <rect x="18" y="-22" width="2" height="7" fill="#222624" />
  <rect x="20" y="-12" width="7" height="3" rx="1" fill="#d99b3d" />
  <path d="M-26 -10h3M-7 -10h3" stroke="#d99b3d" stroke-width="2" />
  ${wheels}
</g>
</svg>`;
}

mkdirSync("dist", { recursive: true });
writeFileSync("dist/github-contribution-train.svg", render(false));
writeFileSync("dist/github-contribution-train-dark.svg", render(true));