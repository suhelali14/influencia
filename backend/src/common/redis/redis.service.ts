import { Injectable, Inject, OnModuleDestroy, Logger } from '@nestjs/common';
import type { RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  
  // Local in-memory fallback store when Redis is offline
  private readonly memoryStore = new Map<string, { value: any; expiresAt?: number }>();
  private readonly setStore = new Map<string, Set<string>>();
  private readonly hashStore = new Map<string, Map<string, string>>();

  constructor(
    @Inject('REDIS_CLIENT') private readonly client: any,
  ) {}

  async onModuleDestroy() {
    try {
      if (this.client && this.client.isOpen) {
        await this.client.quit();
      }
    } catch {
      // ignore
    }
  }

  private isConnected(): boolean {
    return this.client && this.client.isOpen;
  }

  /**
   * Set a key with optional expiration in seconds
   */
  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.isConnected()) {
      try {
        if (ttlSeconds) {
          await this.client.setEx(key, ttlSeconds, value);
          return;
        } else {
          await this.client.set(key, value);
          return;
        }
      } catch (err) {
        this.logger.warn(`Redis set failed: ${err.message}. Falling back to memory store.`);
      }
    }
    
    // Memory Store Fallback
    const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined;
    this.memoryStore.set(key, { value, expiresAt });
  }

  /**
   * Get a value by key
   */
  async get(key: string): Promise<string | null> {
    if (this.isConnected()) {
      try {
        return await this.client.get(key);
      } catch (err) {
        this.logger.warn(`Redis get failed: ${err.message}. Falling back to memory store.`);
      }
    }

    // Memory Store Fallback
    const item = this.memoryStore.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return item.value;
  }

  /**
   * Delete a key
   */
  async del(key: string): Promise<number> {
    let deletedCount = 0;
    if (this.isConnected()) {
      try {
        deletedCount = await this.client.del(key);
        return deletedCount;
      } catch (err) {
        this.logger.warn(`Redis del failed: ${err.message}. Falling back to memory store.`);
      }
    }

    if (this.memoryStore.has(key)) {
      this.memoryStore.delete(key);
      deletedCount = 1;
    }
    this.setStore.delete(key);
    this.hashStore.delete(key);
    return deletedCount;
  }

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    if (this.isConnected()) {
      try {
        const result = await this.client.exists(key);
        return result === 1;
      } catch (err) {
        this.logger.warn(`Redis exists failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) {
      return this.setStore.has(key) || this.hashStore.has(key);
    }
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.memoryStore.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Set expiration on a key
   */
  async expire(key: string, ttlSeconds: number): Promise<boolean> {
    if (this.isConnected()) {
      try {
        const result = await this.client.expire(key, ttlSeconds);
        return Boolean(result);
      } catch (err) {
        this.logger.warn(`Redis expire failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const item = this.memoryStore.get(key);
    if (item) {
      item.expiresAt = Date.now() + ttlSeconds * 1000;
      return true;
    }
    return false;
  }

  /**
   * Get remaining TTL of a key
   */
  async ttl(key: string): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.ttl(key);
      } catch (err) {
        this.logger.warn(`Redis ttl failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const item = this.memoryStore.get(key);
    if (!item) return -2; // Key doesn't exist
    if (item.expiresAt) {
      const diff = Math.round((item.expiresAt - Date.now()) / 1000);
      return diff > 0 ? diff : -2;
    }
    return -1; // No expiration
  }

  /**
   * Store JSON object
   */
  async setJson<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  /**
   * Get JSON object
   */
  async getJson<T>(key: string): Promise<T | null> {
    const value = await this.get(key);
    if (!value) return null;
    try {
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  /**
   * Add to a set
   */
  async sAdd(key: string, ...values: string[]): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.sAdd(key, values);
      } catch (err) {
        this.logger.warn(`Redis sAdd failed: ${err.message}. Falling back to memory store.`);
      }
    }

    let set = this.setStore.get(key);
    if (!set) {
      set = new Set<string>();
      this.setStore.set(key, set);
    }
    let added = 0;
    for (const v of values) {
      if (!set.has(v)) {
        set.add(v);
        added++;
      }
    }
    return added;
  }

  /**
   * Get all members of a set
   */
  async sMembers(key: string): Promise<string[]> {
    if (this.isConnected()) {
      try {
        return await this.client.sMembers(key);
      } catch (err) {
        this.logger.warn(`Redis sMembers failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const set = this.setStore.get(key);
    return set ? Array.from(set) : [];
  }

  /**
   * Remove from a set
   */
  async sRem(key: string, ...values: string[]): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.sRem(key, values);
      } catch (err) {
        this.logger.warn(`Redis sRem failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const set = this.setStore.get(key);
    if (!set) return 0;
    let removed = 0;
    for (const v of values) {
      if (set.has(v)) {
        set.delete(v);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Check if member exists in set
   */
  async sIsMember(key: string, value: string): Promise<boolean> {
    if (this.isConnected()) {
      try {
        const result = await this.client.sIsMember(key, value);
        return Boolean(result);
      } catch (err) {
        this.logger.warn(`Redis sIsMember failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const set = this.setStore.get(key);
    return set ? set.has(value) : false;
  }

  /**
   * Hash set field
   */
  async hSet(key: string, field: string, value: string): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.hSet(key, field, value);
      } catch (err) {
        this.logger.warn(`Redis hSet failed: ${err.message}. Falling back to memory store.`);
      }
    }

    let map = this.hashStore.get(key);
    if (!map) {
      map = new Map<string, string>();
      this.hashStore.set(key, map);
    }
    const exists = map.has(field);
    map.set(field, value);
    return exists ? 0 : 1;
  }

  /**
   * Hash get field
   */
  async hGet(key: string, field: string): Promise<string | undefined> {
    if (this.isConnected()) {
      try {
        const result = await this.client.hGet(key, field);
        return result ?? undefined;
      } catch (err) {
        this.logger.warn(`Redis hGet failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const map = this.hashStore.get(key);
    return map ? map.get(field) : undefined;
  }

  /**
   * Hash get all fields
   */
  async hGetAll(key: string): Promise<Record<string, string>> {
    if (this.isConnected()) {
      try {
        return await this.client.hGetAll(key);
      } catch (err) {
        this.logger.warn(`Redis hGetAll failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const map = this.hashStore.get(key);
    const result: Record<string, string> = {};
    if (map) {
      for (const [f, v] of map.entries()) {
        result[f] = v;
      }
    }
    return result;
  }

  /**
   * Hash delete field
   */
  async hDel(key: string, ...fields: string[]): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.hDel(key, fields);
      } catch (err) {
        this.logger.warn(`Redis hDel failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const map = this.hashStore.get(key);
    if (!map) return 0;
    let deleted = 0;
    for (const f of fields) {
      if (map.has(f)) {
        map.delete(f);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Delete keys matching a pattern
   */
  async deletePattern(pattern: string): Promise<number> {
    if (this.isConnected()) {
      try {
        const keys = await this.client.keys(pattern);
        if (keys.length === 0) return 0;
        return await this.client.del(keys);
      } catch (err) {
        this.logger.warn(`Redis deletePattern failed: ${err.message}. Falling back to memory store.`);
      }
    }

    // Rough pattern matching (e.g. "prefix:*")
    const regexPattern = pattern.replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    let count = 0;
    for (const k of this.memoryStore.keys()) {
      if (regex.test(k)) {
        this.memoryStore.delete(k);
        count++;
      }
    }
    for (const k of this.setStore.keys()) {
      if (regex.test(k)) {
        this.setStore.delete(k);
        count++;
      }
    }
    for (const k of this.hashStore.keys()) {
      if (regex.test(k)) {
        this.hashStore.delete(k);
        count++;
      }
    }
    return count;
  }

  /**
   * Increment a value
   */
  async incr(key: string): Promise<number> {
    if (this.isConnected()) {
      try {
        return await this.client.incr(key);
      } catch (err) {
        this.logger.warn(`Redis incr failed: ${err.message}. Falling back to memory store.`);
      }
    }

    const item = this.memoryStore.get(key);
    let val = 0;
    if (item) {
      val = parseInt(item.value, 10) || 0;
    }
    val++;
    this.memoryStore.set(key, { value: String(val) });
    return val;
  }

  /**
   * Get raw client for advanced operations
   */
  getClient(): RedisClientType {
    return this.client;
  }
}
