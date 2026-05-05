const GOOGLE_IDENTITY_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_API_BASE_URL = 'https://www.googleapis.com/drive/v3';
const DRIVE_UPLOAD_BASE_URL = 'https://www.googleapis.com/upload/drive/v3';
const LIBRARY_FILE_NAME = 'walk-bike-run-library.json';

let googleIdentityScriptPromise = null;
let tokenClient = null;
let accessToken = null;

export function clearGoogleDriveAccessToken() {
  if (accessToken && globalThis.google?.accounts?.oauth2?.revoke) {
    globalThis.google.accounts.oauth2.revoke(accessToken, () => {});
  }
  accessToken = null;
  tokenClient = null;
}

export async function saveLibraryToGoogleDrive({ clientId, json, onStatus }) {
  const token = await requestGoogleDriveAccessToken(clientId);
  const existingFile = await findLibraryFile(token);

  if (existingFile) {
    onStatus?.('Updating existing Google Drive library file...');
    return updateLibraryFile(token, existingFile.id, json);
  }

  onStatus?.('Creating Google Drive library file...');
  return createLibraryFile(token, json);
}

export async function loadLibraryFromGoogleDrive({
  clientId,
  onStatus,
  metadataOnly = false,
}) {
  const token = await requestGoogleDriveAccessToken(clientId);
  const existingFile = await findLibraryFile(token);

  if (metadataOnly) {
    return existingFile;
  }

  if (!existingFile) {
    throw new Error(
      `No ${LIBRARY_FILE_NAME} file found in Google Drive for this app. Save the library first.`,
    );
  }

  onStatus?.('Reading Google Drive library file...');
  return readLibraryFile(token, existingFile.id);
}

async function requestGoogleDriveAccessToken(clientId) {
  await loadGoogleIdentityServices();

  return new Promise((resolve, reject) => {
    tokenClient = globalThis.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (response?.error) {
          reject(new Error(`Google Drive authorization failed: ${response.error}`));
          return;
        }

        accessToken = response?.access_token || null;
        if (!accessToken) {
          reject(new Error('Google Drive authorization did not return a token.'));
          return;
        }

        resolve(accessToken);
      },
    });

    tokenClient.requestAccessToken({ prompt: accessToken ? '' : 'consent' });
  });
}

function loadGoogleIdentityServices() {
  if (globalThis.google?.accounts?.oauth2) {
    return Promise.resolve();
  }

  if (googleIdentityScriptPromise) return googleIdentityScriptPromise;

  googleIdentityScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', () => resolve());
    script.addEventListener('error', () =>
      reject(new Error('Could not load Google Identity Services.')),
    );
    document.head.append(script);
  });

  return googleIdentityScriptPromise;
}

async function findLibraryFile(token) {
  const query = `name = '${escapeDriveQueryValue(LIBRARY_FILE_NAME)}' and trashed = false`;
  const params = new URLSearchParams({
    q: query,
    spaces: 'drive',
    pageSize: '10',
    fields: 'files(id,name,modifiedTime)',
  });
  const response = await driveFetch(
    `${DRIVE_API_BASE_URL}/files?${params.toString()}`,
    { token },
  );
  const data = await response.json();
  return data.files?.[0] || null;
}

async function createLibraryFile(token, json) {
  const { body, contentType } = createMultipartBody({
    metadata: {
      name: LIBRARY_FILE_NAME,
      mimeType: 'application/json',
    },
    json,
  });

  const response = await driveFetch(
    `${DRIVE_UPLOAD_BASE_URL}/files?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      token,
      method: 'POST',
      headers: { 'Content-Type': contentType },
      body,
    },
  );

  return response.json();
}

async function updateLibraryFile(token, fileId, json) {
  const { body, contentType } = createMultipartBody({
    metadata: {
      name: LIBRARY_FILE_NAME,
      mimeType: 'application/json',
    },
    json,
  });

  const response = await driveFetch(
    `${DRIVE_UPLOAD_BASE_URL}/files/${encodeURIComponent(fileId)}?uploadType=multipart&fields=id,name,modifiedTime`,
    {
      token,
      method: 'PATCH',
      headers: { 'Content-Type': contentType },
      body,
    },
  );

  return response.json();
}

async function readLibraryFile(token, fileId) {
  const response = await driveFetch(
    `${DRIVE_API_BASE_URL}/files/${encodeURIComponent(fileId)}?alt=media`,
    { token },
  );
  return response.text();
}

async function driveFetch(url, { token, method = 'GET', headers = {}, body } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(await formatDriveError(response));
  }

  return response;
}

async function formatDriveError(response) {
  try {
    const data = await response.json();
    const message = data.error?.message;
    if (message) return `Google Drive error: ${message}`;
  } catch {
    // Fall back to status text below.
  }
  return `Google Drive error: ${response.status} ${response.statusText}`;
}

function createMultipartBody({ metadata, json }) {
  const boundary = `walk-bike-run-${crypto.randomUUID()}`;
  const delimiter = `--${boundary}`;
  const closeDelimiter = `--${boundary}--`;
  const body = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    delimiter,
    'Content-Type: application/json; charset=UTF-8',
    '',
    json,
    closeDelimiter,
    '',
  ].join('\r\n');

  return {
    body,
    contentType: `multipart/related; boundary=${boundary}`,
  };
}

function escapeDriveQueryValue(value) {
  return String(value).replaceAll('\\', '\\\\').replaceAll("'", "\\'");
}
