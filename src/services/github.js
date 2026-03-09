/**
 * GitHub Service
 * Handles reading and writing files directly to the GitHub repository.
 */

const OWNER = import.meta.env.VITE_GITHUB_OWNER || 'SamRosati';
const REPO = import.meta.env.VITE_GITHUB_REPO || 'upt-configurator';
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH || 'main';
const TOKEN = import.meta.env.VITE_GITHUB_TOKEN;

const BASE_URL = `https://api.github.com/repos/${OWNER}/${REPO}`;

const getHeaders = () => {
    if (!TOKEN) {
        throw new Error('VITE_GITHUB_TOKEN is missing. Please add it to your environment variables.');
    }
    return {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };
};

/**
 * Fetches the metadata (including SHA) and content of a file.
 * @param {string} path - The path to the file in the repo.
 */
export async function getFile(path) {
    const response = await fetch(`${BASE_URL}/contents/${path}?ref=${BRANCH}`, { headers: getHeaders() });
    if (!response.ok) {
        throw new Error(`Failed to fetch ${path}: ${response.statusText}`);
    }
    return await response.ok ? response.json() : null;
}

/**
 * Updates or creates a file in the repository.
 * @param {string} path - The path to the file in the repo.
    * @param {string} content - Base64 encoded content.
    * @param {string} message - Commit message.
    * @param {string} sha - The SHA of the existing file (required for updates).
    */
export async function updateFile(path, content, message, sha = null) {
    const body = {
        message,
        content,
        branch: BRANCH
    };

    if (sha) {
        body.sha = sha;
    }

    const response = await fetch(`${BASE_URL}/contents/${path}`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(`Failed to update ${path}: ${error.message}`);
    }

    return await response.json();
}

/**
 * Helper to get the Excel file particularly.
 */
export async function getExcelData() {
    const data = await getFile('Configurator_Data.xlsx');
    return {
        sha: data.sha,
        content: data.content // This is base64
    };
}
