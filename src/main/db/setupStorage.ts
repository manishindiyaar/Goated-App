/**
 * Main Process RxDB Storage Setup
 * Requirements: 1.1, 1.2
 * 
 * Exposes RxDB storage via IPC for renderer process access.
 * Uses memory storage in main process - data persists via IndexedDB in renderer.
 */

import { exposeIpcMainRxStorage } from 'rxdb/plugins/electron';
import { getRxStorageMemory } from 'rxdb/plugins/storage-memory';
import { ipcMain } from 'electron';

/**
 * Sets up RxDB storage in the main process and exposes it via IPC.
 * Must be called after app.whenReady() in the main process.
 */
export function setupMainProcessStorage(): void {
  exposeIpcMainRxStorage({
    key: 'goated-app-storage',
    storage: getRxStorageMemory(),
    ipcMain
  });
  
  console.log('[RxDB] Main process storage exposed via IPC');
}
