// Pure, testable hostname and path policy for the dedicated management portal.
export const ADMIN_HOST = 'admin.hexsettlers.org';
const PRIVATE_ASSET_PATHS = new Set(['/admin-portal.css']);
export function isAdminHost(request) {
  return new URL(request.url).hostname.toLowerCase() === ADMIN_HOST;
}
export function isAdminApiPath(pathname) {
  return pathname.startsWith('/api/admin/');
}
export function isPrivatePortalAsset(pathname) {
  return PRIVATE_ASSET_PATHS.has(pathname);
}
export function isAllowedAdminPortalPath(pathname) {
  // Dashboard uses the existing tested app runtime and all six management panels.
  // No live room or multiplayer API is necessary on the management hostname.
  if (pathname === '/health') return true;
  if (pathname === '/ws') return false; // administration never joins game sockets
  if (pathname.startsWith('/api/admin/')) return true;
  if (pathname.startsWith('/api/auth/')) return true;
  if (pathname.startsWith('/api/account/')) return true;
  if (pathname === '/api/build-version') return true;
  if (pathname.startsWith('/api/')) return false;
  return true; // static files requested by the reused dashboard bundle
}

