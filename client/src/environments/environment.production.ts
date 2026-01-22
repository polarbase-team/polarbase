export const environment = {
  production: true,
  version: 'v0.5.1-beta',
  assetUrl: '/static',
  apiUrl: '/api',
  wsUrl: '/ws',
  uploadUrl: '/files/upload',
  dateFormat: 'DD/MM/YYYY',
  dateTimeFormat: 'DD/MM/YYYY HH:mm',
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    email: 'polarbase-team@polarbase.io',
    defaultLocation: [21.028511, 105.804817], // Hanoi, Vietnam
  },
};
