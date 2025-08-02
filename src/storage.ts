import { writeFile, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { FormData } from './types.js';

const STORAGE_FILE = 'forms.json';

export class Storage {
  private forms = new Map<string, FormData>();

  async init(): Promise<void> {
    if (existsSync(STORAGE_FILE)) {
      try {
        const data = await readFile(STORAGE_FILE, 'utf-8');
        const formsData = JSON.parse(data);
        this.forms = new Map(Object.entries(formsData));
        console.error(`Loaded ${this.forms.size} forms from ${STORAGE_FILE}`);
      } catch (error) {
        console.error(`Error loading forms from ${STORAGE_FILE}:`, error);
      }
    }
  }

  async save(): Promise<void> {
    try {
      const formsData = Object.fromEntries(this.forms);
      await writeFile(STORAGE_FILE, JSON.stringify(formsData, null, 2));
    } catch (error) {
      console.error('Error saving forms:', error);
    }
  }

  setForm(id: string, formData: FormData): void {
    this.forms.set(id, formData);
    this.save().catch(console.error);
  }

  async getForm(id: string): Promise<FormData | undefined> {
    await this.reload();
    return this.forms.get(id);
  }

  private async reload(): Promise<void> {
    if (existsSync(STORAGE_FILE)) {
      try {
        const data = await readFile(STORAGE_FILE, 'utf-8');
        const formsData = JSON.parse(data);
        this.forms = new Map(Object.entries(formsData));
      } catch (error) {
        console.error(`Error reloading forms from ${STORAGE_FILE}:`, error);
      }
    }
  }

  getAllForms(): Map<string, FormData> {
    return new Map(this.forms);
  }

  deleteForm(id: string): boolean {
    const deleted = this.forms.delete(id);
    if (deleted) {
      this.save().catch(console.error);
    }
    return deleted;
  }

  setupGracefulShutdown(): void {
    const gracefulShutdown = async (signal: string) => {
      console.error(`Received ${signal}, saving forms and shutting down...`);
      await this.save();
      process.exit(0);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  }
}

export const storage = new Storage();