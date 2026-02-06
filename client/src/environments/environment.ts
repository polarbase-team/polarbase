export const environment = {
  production: false,
  version: 'v0.8.0-beta',
  assetUrl: '/static',
  apiUrl: '/api',
  wsUrl: '/ws',
  uploadUrl: '/files/upload',
  defaultCurrency: 'VND',
  defaultDateFormat: 'DD/MM/YYYY',
  defaultDateTimeFormat: 'DD/MM/YYYY HH:mm',
  openStreetMap: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    nominatimUrl: 'https://nominatim.openstreetmap.org/search',
    email: 'polarbase-team@polarbase.io',
    defaultLocation: [21.028511, 105.804817], // Hanoi, Vietnam
  },
};
