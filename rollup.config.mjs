import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

const input = 'src/index.ts';

// `lit` is kept external in the ESM build so bundler consumers can dedupe it.
// It is bundled into the UMD build so the component works from a plain <script> tag.
const isLit = (id) => id === 'lit' || id.startsWith('lit/');

const INLINE_CSS_QUERY = '?inline';

/**
 * Resolves `import styles from './x.css?inline'` to the stylesheet's contents
 * as a string. Vite supports this natively; this plugin gives the Rollup
 * library build the same behaviour without an extra dependency.
 */
const inlineCss = () => ({
  name: 'inline-css',
  resolveId(source, importer) {
    if (!source.endsWith(INLINE_CSS_QUERY)) return null;
    const withoutQuery = source.slice(0, -INLINE_CSS_QUERY.length);
    if (!withoutQuery.startsWith('.')) return null;
    const resolved = path.resolve(path.dirname(importer), withoutQuery);
    return `${resolved}${INLINE_CSS_QUERY}`;
  },
  async load(id) {
    if (!id.endsWith(INLINE_CSS_QUERY)) return null;
    const filePath = id.slice(0, -INLINE_CSS_QUERY.length);
    const css = await readFile(filePath, 'utf8');
    return `export default ${JSON.stringify(css)};`;
  },
});

const typescriptPlugin = () =>
  typescript({
    tsconfig: './tsconfig.build.json',
    // Declarations are emitted separately by `tsc` (see the build:types script).
    declaration: false,
    declarationMap: false,
  });

/**
 * Emits the design tokens as a standalone `dist/theme.css` so consumers can
 * import the base CSS directly: `import 'web-components-library/theme.css'`.
 */
const emitTheme = () => ({
  name: 'emit-theme',
  async generateBundle() {
    const css = await readFile('src/styles/tokens.css', 'utf8');
    this.emitFile({ type: 'asset', fileName: 'theme.css', source: css });
  },
});

const plugins = () => [
  nodeResolve({ extensions: ['.ts', '.js'] }),
  inlineCss(),
  typescriptPlugin(),
  terser(),
];

/** @type {import('rollup').RollupOptions[]} */
export default [
  {
    input,
    external: isLit,
    plugins: [...plugins(), emitTheme()],
    output: {
      file: 'dist/index.js',
      format: 'es',
      sourcemap: true,
    },
  },
  {
    input,
    plugins: plugins(),
    output: {
      file: 'dist/index.umd.cjs',
      format: 'umd',
      name: 'WebComponentsLibrary',
      sourcemap: true,
    },
  },
];
