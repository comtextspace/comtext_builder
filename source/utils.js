
export function isRunningInGitHubActions() {
   return true; // return process.env.GITHUB_ACTIONS === "true";
}
