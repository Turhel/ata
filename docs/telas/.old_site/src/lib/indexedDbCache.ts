import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface CacheDBSchema extends DBSchema {
  cache: {
    key: string;
    value: {
      data: any;
      timestamp: number;
      expiresAt: number;
    };
    indexes: {
      'by-expiresAt': number;
    };
  };
}

class IndexedDBCache {
  private db: IDBPDatabase<CacheDBSchema> | null = null;
  private dbName = 'ata-cache-db';
  private version = 1;

  async init(): Promise<IDBPDatabase<CacheDBSchema>> {
    if (this.db) return this.db;

    this.db = await openDB<CacheDBSchema>(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('cache')) {
          const store = db.createObjectStore('cache', { keyPath: 'key' });
          store.createIndex('by-expiresAt', 'expiresAt');
        }
      },
    });

    return this.db;
  }

  async set(key: string, data: any, maxAge: number = 600000): Promise<void> {
    const db = await this.init();
    const timestamp = Date.now();
    const expiresAt = timestamp + maxAge;

    await db.put('cache', {
      key,
      data,
      timestamp,
      expiresAt
    });
  }

  async get(key: string): Promise<any | null> {
    const db = await this.init();
    const result = await db.get('cache', key);
    
    if (!result) return null;
    
    // Verificar se expirou
    if (Date.now() > result.expiresAt) {
      await this.delete(key);
      return null;
    }
    
    return result.data;
  }

  async delete(key: string): Promise<void> {
    const db = await this.init();
    await db.delete('cache', key);
  }

  async clear(): Promise<void> {
    const db = await this.init();
    await db.clear('cache');
  }

  async cleanup(): Promise<void> {
    const db = await this.init();
    const tx = db.transaction('cache', 'readwrite');
      const index = tx.store.index('by-expiresAt');
    const expiredKeys = await index.getAllKeys(IDBKeyRange.upperBound(Date.now()));
    
    for (const key of expiredKeys) {
      await tx.store.delete(key);
    }
    
    await tx.done;
  }
}

export const indexedDbCache = new IndexedDBCache();

// Inicializar limpeza automática a cada hora
if (typeof window !== 'undefined') {
  setInterval(() => indexedDbCache.cleanup(), 60 * 60 * 1000);
}