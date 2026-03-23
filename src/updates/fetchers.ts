/**
 * Fetch the latest published version of an npm package.
 */
export async function fetchNpmVersion(packageName: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`);
    if (!res.ok) return undefined;
    const data = await res.json() as { version?: string };
    return data.version ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch the latest published version of a PyPI package.
 */
export async function fetchPypiVersion(packageName: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(packageName)}/json`);
    if (!res.ok) return undefined;
    const data = await res.json() as { info?: { version?: string } };
    return data.info?.version ?? undefined;
  } catch {
    return undefined;
  }
}

/**
 * Fetch the latest release tag from a GitHub repository.
 * repo should be in "owner/repo" format.
 */
export async function fetchGithubVersion(repo: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!res.ok) return undefined;
    const data = await res.json() as { tag_name?: string };
    const tag = data.tag_name ?? undefined;
    // Strip leading "v" from tag names like "v1.2.3"
    return tag ? tag.replace(/^v/, "") : undefined;
  } catch {
    return undefined;
  }
}
