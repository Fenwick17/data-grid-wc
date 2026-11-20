/**
 * Ambient declarations for CSS imports.
 *
 * `?inline` imports resolve to the stylesheet's contents as a string.
 * Vite provides this at dev/build time; this declaration teaches TypeScript
 * about the module shape so `import styles from './x.css?inline'` type-checks.
 */
declare module '*.css?inline' {
  const css: string;
  export default css;
}
