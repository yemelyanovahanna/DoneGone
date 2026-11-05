const fs = require('fs');
const { execFileSync } = require('child_process');
const tracked = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const findings = [];
for (const file of tracked) {
  if (/(^|\/)\.env($|\.)/.test(file) && !file.endsWith('.example')) findings.push(`${file}: environment file is tracked`);
  if (/\.tfstate($|\.)|(^|\/)id_(rsa|ed25519)$/.test(file)) findings.push(`${file}: private state/key is tracked`);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
  const data = fs.readFileSync(file);
  if (data.includes(0)) continue;
  const text = data.toString('utf8');
  if (/gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}|-----BEGIN (?:OPENSSH|RSA|EC) PRIVATE KEY-----/.test(text)) findings.push(`${file}: possible token/private key`);
}
if (findings.length) { console.error(findings.join('\n')); process.exitCode = 1; }
else console.log(`Repository credential check passed (${tracked.length} tracked files). No tracked env, state, private key or recognized GitHub token found.`);
