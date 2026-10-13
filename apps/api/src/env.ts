import { fileURLToPath } from 'node:url';
import { config as loadDotenv } from 'dotenv';
import { loadConfig } from '@driftwatch/core';

// repo-root .env, regardless of which package cwd the process runs from
loadDotenv({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) });

export const config = loadConfig();