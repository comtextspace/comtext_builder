
export function isRunningInGitHubActions() {
    return process.env.GITHUB_ACTIONS === 'true';
}
