import { Client } from 'pg';
import {
  LogicalReplicationService,
  PgoutputPlugin,
} from 'pg-logical-replication';

import { log } from '../utils/logger';
import { pgConfig } from '../plugins/db';
import { WebSocket } from '../plugins/web-socket';

/**
 * Name of the logical replication slot used for CDC.
 */
const SLOT_NAME = 'cdc_slot';

/**
 * Name of the publication that exposes changes from all tables.
 */
const PUBLICATION_NAME = 'cdc_publication';

/**
 * Sets up the required PostgreSQL objects for logical replication:
 * - Creates a publication containing all tables
 * - Creates a logical replication slot using pgoutput plugin
 *
 * Idempotent – if objects already exist, it logs and continues.
 */
export async function setupReplication() {
  const client = new Client({
    ...pgConfig,
    // Special connection string with replication=database required for slot management
    connectionString: `postgres://${pgConfig.user}:${pgConfig.password}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}?replication=database`,
  });

  try {
    await client.connect();
    log.info('Connected to PostgreSQL for replication setup...');

    // Create publication for all tables
    try {
      await client.query(
        `CREATE PUBLICATION ${PUBLICATION_NAME} FOR ALL TABLES`
      );
      log.info(`Publication "${PUBLICATION_NAME}" created successfully`);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('already exists')) {
        log.info(`Publication "${PUBLICATION_NAME}" already exists → OK`);
      } else {
        throw err;
      }
    }

    // Create logical replication slot with pgoutput plugin
    try {
      await client.query(
        `SELECT pg_create_logical_replication_slot('${SLOT_NAME}', 'pgoutput')`
      );
      log.info(
        `Replication slot "${SLOT_NAME}" created successfully (pgoutput)`
      );
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('already exists')) {
        log.info(`Slot "${SLOT_NAME}" already exists → OK`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error during replication setup:', err.message);
  } finally {
    await client.end();
  }
}

/**
 * Starts the Change Data Capture (CDC) stream:
 * - Connects to the logical replication slot
 * - Listens to INSERT / UPDATE / DELETE events in real time
 * - Automatically reconnects on failure
 */
export async function startCDC() {
  const service = new LogicalReplicationService(pgConfig);

  // Configure pgoutput plugin with the publication we created
  const plugin = new PgoutputPlugin({
    protoVersion: 2,
    publicationNames: [PUBLICATION_NAME],
  });

  /**
   * Event handler for incoming WAL messages.
   * Only INSERT, UPDATE, DELETE are processed here.
   */
  service.on('data', (lsn, message) => {
    switch (message.tag) {
      case 'insert':
      case 'update':
      case 'delete':
        WebSocket.broadcast(message);
        break;
    }
  });

  /**
   * Global error handler for the replication stream.
   */
  service.on('error', (err) => {
    console.error('Replication service error:', err.message);
  });

  /**
   * Subscribes to the replication slot with exponential retry logic.
   * Keeps trying forever until successful connection is established.
   */
  const subscribeWithRetry = async () => {
    while (true) {
      try {
        log.info('Connecting to CDC stream...');
        await service.subscribe(plugin, SLOT_NAME);
        log.info('CDC stream connected successfully!');
        return; // Success – exit retry loop
      } catch (error) {
        const err = error as Error;
        console.error('Failed to connect CDC stream:', err.message);
        log.info('Retrying in 5 seconds...');
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  subscribeWithRetry();
}
