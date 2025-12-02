import { Client } from 'pg';
import {
  LogicalReplicationService,
  PgoutputPlugin,
} from 'pg-logical-replication';
import { pgConfig } from '../plugins/db';

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
async function setupReplication() {
  const client = new Client({
    ...pgConfig,
    // Special connection string with replication=database required for slot management
    connectionString: `postgres://${pgConfig.user}:${pgConfig.password}@${pgConfig.host}:${pgConfig.port}/${pgConfig.database}?replication=database`,
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL for replication setup...');

    // Create publication for all tables
    try {
      await client.query(
        `CREATE PUBLICATION ${PUBLICATION_NAME} FOR ALL TABLES`
      );
      console.log(`Publication "${PUBLICATION_NAME}" created successfully`);
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('already exists')) {
        console.log(`Publication "${PUBLICATION_NAME}" already exists → OK`);
      } else {
        throw err;
      }
    }

    // Create logical replication slot with pgoutput plugin
    try {
      await client.query(
        `SELECT pg_create_logical_replication_slot('${SLOT_NAME}', 'pgoutput')`
      );
      console.log(
        `Replication slot "${SLOT_NAME}" created successfully (pgoutput)`
      );
    } catch (error) {
      const err = error as Error;
      if (err.message.includes('already exists')) {
        console.log(`Slot "${SLOT_NAME}" already exists → OK`);
      } else {
        throw err;
      }
    }
  } catch (error) {
    const err = error as Error;
    console.error('Error during replication setup:', err.message);
    process.exit(1);
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
async function startCDC() {
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
        console.log(`INSERT → table: ${message.relation.name}`);
        // console.log("   New row:", message.new.tuple);
        break;
      case 'update':
        console.log(`UPDATE → table: ${message.relation.name}`);
        // console.log("   Old row:", message.old?.tuple);
        // console.log("   New row:", message.new.tuple);
        break;
      case 'delete':
        console.log(`DELETE → table: ${message.relation.name}`);
        // console.log("   Deleted row:", message.old.tuple);
        break;
      // Transaction begin/commit messages are ignored in this simple example
      // case "begin":
      // case "commit":
      //   break;
      default:
        // console.log("Other message:", message);
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
        console.log('Connecting to CDC stream...');
        await service.subscribe(plugin, SLOT_NAME);
        console.log('CDC stream connected successfully!');
        return; // Success – exit retry loop
      } catch (error) {
        const err = error as Error;
        console.error('Failed to connect CDC stream:', err.message);
        console.log('Retrying in 5 seconds...');
        await new Promise((r) => setTimeout(r, 5000));
      }
    }
  };

  subscribeWithRetry();
}

/**
 * Public function to enable CDC:
 * 1. Ensures publication and replication slot exist
 * 2. Starts listening to real-time changes
 */
export async function enableCDC() {
  await setupReplication();
  await startCDC();
}
