import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SystemSettingsService implements OnModuleInit {
  private readonly logger = new Logger(SystemSettingsService.name);
  private settingsCache: Map<string, string> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  async refreshCache() {
    try {
      const settings = await this.prisma.systemSetting.findMany();
      this.settingsCache.clear();
      for (const s of settings) {
        this.settingsCache.set(s.key, s.value);
      }
      this.logger.log(`Loaded ${this.settingsCache.size} system settings into memory cache`);
    } catch (e) {
      this.logger.error('Failed to load system settings from database during startup', e);
    }
  }

  get(key: string, defaultValue: string = ''): string {
    return this.settingsCache.get(key) ?? defaultValue;
  }

  getNumber(key: string, defaultValue: number = 0): number {
    const val = this.settingsCache.get(key);
    if (val === undefined || val === '') return defaultValue;
    const num = parseFloat(val);
    return isNaN(num) ? defaultValue : num;
  }

  async getAll() {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSetting(key: string, value: string) {
    const updated = await this.prisma.systemSetting.update({
      where: { key },
      data: { value },
    });
    this.settingsCache.set(key, value);
    return updated;
  }
}
