import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { createClient } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client;

  async onModuleInit() {
    this.client = createClient({ url: 'redis://localhost:6379' });
    this.client.on('error', (err) => console.error('Redis Client Error', err));
    await this.client.connect();
  }

  async set(key: string, value: any) {
    await this.client.set(key, JSON.stringify(value));    
  }

  async get(key: string) {
    const data = await this.client.get(key);
    return data ? JSON.parse(data) : null;
  }

  async del(key: string) {
    await this.client.del(key);
  }

  async keys(key: string) {
    return await this.client.keys(key)
  }

  async onModuleDestroy() {
    await this.client.quit();
  }
}