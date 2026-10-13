import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '@driftwatch/core';

loadDotenv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export const config = loadConfig();