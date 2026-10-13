// Deliberately dynamic content: proves the mask (.timestamp) keeps
// captures deterministic across builds.
document.getElementById('ts').textContent = new Date().toLocaleTimeString('en-US');