import { Database } from 'bun:sqlite';

const APP_NAME = process.env.NAME || 'PolarBase';

export default new Database(`${APP_NAME}.db`);
