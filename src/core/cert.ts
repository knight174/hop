import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import selfsigned from 'selfsigned';
import { logger } from './logger';

const CERT_DIR = path.join(os.homedir(), '.hop');
const KEY_FILE = path.join(CERT_DIR, 'key.pem');
const CERT_FILE = path.join(CERT_DIR, 'cert.pem');

export interface Certificate {
  key: string;
  cert: string;
}

export async function getCertificate(): Promise<Certificate> {
  try {
    await fs.ensureDir(CERT_DIR);

    if ((await fs.pathExists(KEY_FILE)) && (await fs.pathExists(CERT_FILE))) {
      const key = await fs.readFile(KEY_FILE, 'utf-8');
      const cert = await fs.readFile(CERT_FILE, 'utf-8');
      return { key, cert };
    }

    logger.info('Generating self-signed certificate for HTTPS...');

    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });

    await fs.writeFile(KEY_FILE, pems.private);
    await fs.writeFile(CERT_FILE, pems.cert);

    logger.success('Certificate generated successfully.');
    return { key: pems.private, cert: pems.cert };
  } catch (error) {
    throw new Error(`Failed to get certificate: ${error}`);
  }
}
