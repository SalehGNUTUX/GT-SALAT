import { app } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

export interface Dhikr {
  id: number;
  text: string;
}

let cache: Dhikr[] | null = null;

function resourcesDir(): string {
  // في التطوير: resources/ داخل المشروع. في الإنتاج: process.resourcesPath.
  if (app.isPackaged) return process.resourcesPath;
  return path.join(app.getAppPath(), 'resources');
}

export function azkarFilePath(): string {
  return path.join(resourcesDir(), 'azkar.txt');
}

export function loadAllAzkar(): Dhikr[] {
  if (cache) return cache;
  const p = azkarFilePath();
  if (!fs.existsSync(p)) {
    cache = [];
    return cache;
  }
  const raw = fs.readFileSync(p, 'utf-8');
  const parts = raw.split(/\n%\n|\n%/).map((t) => t.trim()).filter((t) => t.length > 0);
  cache = parts.map((text, i) => ({ id: i, text }));
  return cache;
}

export function getRandomDhikr(): Dhikr | null {
  const list = loadAllAzkar();
  if (list.length === 0) return null;
  return list[Math.floor(Math.random() * list.length)];
}

export function getDhikrByIndex(index: number): Dhikr | null {
  const list = loadAllAzkar();
  if (list.length === 0) return null;
  return list[((index % list.length) + list.length) % list.length];
}

export function getAzkarCount(): number {
  return loadAllAzkar().length;
}
