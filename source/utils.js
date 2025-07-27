
function isRunningInGitHubActions() {
    return process.env.GITHUB_ACTIONS === 'true';
}

module.exports = { isRunningInGitHubActions };
