import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const targetPath = path.resolve(__dirname, '../node_modules/fetch-blob/file.js');

const expectedSource = `import Blob from './index.js'

const _File = class File extends Blob {
  #lastModified = 0
  #name = ''

  /**
   * @param {*[]} fileBits
   * @param {string} fileName
   * @param {{ lastModified?: number, type?: string }} options
   */
  constructor (fileBits, fileName, options = {}) {
    if (arguments.length < 2) {
      throw new TypeError(\`Failed to construct 'File': 2 arguments required, but only \${arguments.length} present.\`)
    }

    super(fileBits, options)

    const lastModified = options.lastModified === undefined
      ? Date.now()
      : Number(options.lastModified)

    this.#lastModified = Number.isNaN(lastModified) ? 0 : lastModified
    this.#name = String(fileName).replace(/\\//g, ':')
  }

  get name () {
    return this.#name
  }

  get lastModified () {
    return this.#lastModified
  }

  get [Symbol.toStringTag] () {
    return 'File'
  }
}

export const File = _File
export default File
`;

try {
  if (!fs.existsSync(targetPath)) {
    console.warn(`[repair-fetch-blob] file not found: ${targetPath}`);
    process.exit(0);
  }

  const currentSource = fs.readFileSync(targetPath, 'utf8');
  if (currentSource.trim().length > 0) {
    console.log('[repair-fetch-blob] fetch-blob/file.js already looks healthy');
    process.exit(0);
  }

  fs.writeFileSync(targetPath, expectedSource, 'utf8');
  console.log('[repair-fetch-blob] repaired empty fetch-blob/file.js');
} catch (error) {
  console.error('[repair-fetch-blob] failed', {
    message: error?.message,
  });
  process.exit(1);
}
