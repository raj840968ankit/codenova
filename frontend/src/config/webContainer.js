import { WebContainer } from '@webcontainer/api';

let webContainerInstance = null;

export const getWebContainer = async () => {
  if (webContainerInstance) return webContainerInstance;
  
  try {
    // Additional checks for browser support
    if (!('WebContainer' in window)) {
      throw new Error('WebContainer API not available in this browser');
    }

    if (!window.isSecureContext && window.location.hostname !== 'localhost') {
      throw new Error('WebContainer requires HTTPS or localhost environment');
    }

    webContainerInstance = await WebContainer.boot();
    return webContainerInstance;
  } catch (error) {
    console.error('WebContainer boot failed:', error);
    throw new Error(`WebContainer initialization failed: ${error.message}`);
  }
};