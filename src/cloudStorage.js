import {
  clearGoogleDriveAccessToken,
  loadLibraryFromGoogleDrive,
  saveLibraryToGoogleDrive,
} from './googleDriveStorage.js';

export const GOOGLE_DRIVE_CLIENT_ID_STORAGE_KEY =
  'walkBikeRun.googleDriveClientId';

export function createLocalDownloadProvider({
  fileName = createLibraryBackupFileName(),
} = {}) {
  return {
    id: 'localDownload',
    label: 'Local download',
    saveLibrary(json) {
      downloadJson(json, fileName);
    },
  };
}

export function createGoogleDriveProvider({ clientId, onStatus } = {}) {
  return {
    id: 'googleDrive',
    label: 'Google Drive',
    async connect() {
      validateClientId(clientId);
      await loadLibraryFromGoogleDrive({ clientId, onStatus, metadataOnly: true });
    },
    disconnect() {
      clearGoogleDriveAccessToken();
    },
    async saveLibrary(json) {
      validateClientId(clientId);
      return saveLibraryToGoogleDrive({ clientId, json, onStatus });
    },
    async loadLibrary() {
      validateClientId(clientId);
      return loadLibraryFromGoogleDrive({ clientId, onStatus });
    },
  };
}

function validateClientId(clientId) {
  if (!String(clientId ?? '').trim()) {
    throw new Error('Enter a Google OAuth Client ID first.');
  }
}

function downloadJson(json, fileName) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function createLibraryBackupFileName() {
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `walk-bike-run-routes-${dateStamp}.json`;
}
