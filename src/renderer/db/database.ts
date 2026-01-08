/**
 * Renderer Process RxDB Database Setup
 * Requirements: 1.1, 1.2, 1.3
 * 
 * Creates and manages the RxDB database instance in the renderer process.
 * Uses Dexie storage (IndexedDB) for persistent storage in Electron.
 */

import { createRxDatabase, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { 
  conversationSchema, 
  messageSchema, 
  ConversationDocument, 
  MessageDocument 
} from './schemas';

// Collection types
export type ConversationCollection = RxCollection<ConversationDocument>;
export type MessageCollection = RxCollection<MessageDocument>;

// Database collections interface
export interface DatabaseCollections {
  conversations: ConversationCollection;
  messages: MessageCollection;
}

// Database type
export type GoatedDatabase = RxDatabase<DatabaseCollections>;

// Global singleton - survives HMR and React strict mode
const GLOBAL_KEY = '__RXDB_INSTANCE__';

// Get or set global instance
function getGlobalDb(): GoatedDatabase | null {
  return (window as any)[GLOBAL_KEY] || null;
}

function setGlobalDb(db: GoatedDatabase): void {
  (window as any)[GLOBAL_KEY] = db;
}

// Initialization lock
let initPromise: Promise<GoatedDatabase> | null = null;

/**
 * Gets or creates the RxDB database instance.
 * Uses singleton pattern to ensure only one database connection.
 */
export async function getDatabase(): Promise<GoatedDatabase> {
  // Return existing global instance
  const existing = getGlobalDb();
  if (existing) {
    return existing;
  }

  // Return pending initialization
  if (initPromise) {
    return initPromise;
  }

  // Start initialization
  initPromise = initializeDatabase();
  
  try {
    const db = await initPromise;
    setGlobalDb(db);
    return db;
  } finally {
    initPromise = null;
  }
}

async function initializeDatabase(): Promise<GoatedDatabase> {
  console.log('[RxDB] Creating database with Dexie storage');
  
  const db = await createRxDatabase<DatabaseCollections>({
    name: 'goatedapp',
    storage: getRxStorageDexie(),
    multiInstance: false
  });

  // Add collections with schemas
  await db.addCollections({
    conversations: { schema: conversationSchema },
    messages: { schema: messageSchema }
  });

  console.log('[RxDB] Database initialized successfully');
  return db;
}

/**
 * Closes the database connection.
 */
export async function closeDatabase(): Promise<void> {
  const db = getGlobalDb();
  if (db) {
    await db.close();
    (window as any)[GLOBAL_KEY] = null;
    console.log('[RxDB] Database closed');
  }
}
