const { contextBridge, ipcRenderer } = require('electron');

const config = {
  backendBase: process.env.MISSION_CONTROL_BACKEND_URL || 'https://mission-control-backend-topaz.vercel.app',
  controlPlaneUrl: process.env.MISSION_CONTROL_CONTROL_PLANE_URL || 'https://mission-control-control-plane.vercel.app',
  protocol: 'missioncontrol',
};

contextBridge.exposeInMainWorld('missionControlDesktop', {
  isDesktop: true,
  platform: process.platform,
  config,
  getLaunchContext: () => ipcRenderer.invoke('desktop:get-launch-context'),
  clearPendingDeepLink: () => ipcRenderer.invoke('desktop:clear-pending-deep-link'),
  openExternal: (url) => ipcRenderer.invoke('desktop:open-external', url),
  onDeepLink: (callback) => {
    if (typeof callback !== 'function') return () => {};
    const listener = (_event, payload) => callback(payload);
    ipcRenderer.on('desktop:deep-link', listener);
    return () => ipcRenderer.removeListener('desktop:deep-link', listener);
  },
});
