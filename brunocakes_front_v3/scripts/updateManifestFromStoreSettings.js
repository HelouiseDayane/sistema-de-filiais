// Script para atualizar manifest.json com dados do backend
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_URL = process.env.API_URL || 'http://localhost:8191/api/store/settings';
const manifestPath = path.resolve(__dirname, '../public/manifest.json');

async function updateManifest() {
  try {
    const res = await fetch(API_URL);
    if (!res.ok) throw new Error('Erro ao buscar store settings: ' + res.status);
    const settings = await res.json();

    // Carrega manifest atual
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

    manifest.name = settings.store_name + (settings.store_slogan ? ' - ' + settings.store_slogan : '');
    manifest.short_name = settings.store_name || '';
    manifest.description = `A melhor doceria da cidade!${settings.store_slogan ? ' ' + settings.store_slogan : ''}`;
    manifest.theme_color = settings.primary_color || manifest.theme_color;
    manifest.background_color = '#ffffff';

    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Manifest atualizado com sucesso!');
  } catch (err) {
    console.error('Erro ao atualizar manifest:', err);
    process.exit(1);
  }
}

updateManifest();
