
import typescript from 'rollup-plugin-typescript2'
import builtins from 'rollup-plugin-node-builtins'
import globals from 'rollup-plugin-node-globals';
import commonjs from 'rollup-plugin-commonjs'
import resolve from 'rollup-plugin-node-resolve'
import sourceMaps from 'rollup-plugin-sourcemaps'

let pkg = require('./package.json')

const libraryName = 'library'

export default {
  input: `src/${libraryName}.ts`,
  output: [
    { file: pkg.main, name: libraryName, format: 'umd', sourcemap: true },
    { file: pkg.module, format: 'es', sourcemap: true },
  ],
  // Indicate here external modules you don't wanna include in your bundle (i.e.: 'lodash')
  external: ['crypto', 'express', 'node-jose'],
  watch: {
    include: 'src/**',
  },
  plugins: [
    // Compile TypeScript files
    typescript(),
    // allow node builtins like crypto to be referenced
    // see bottom of: https://github.com/calvinmetcalf/rollup-plugin-node-builtins
    globals(),
    builtins(),
    // Allow bundling cjs modules (unlike webpack, rollup doesn't understand cjs)
    commonjs(),
    // Allow node_modules resolution, so you can use 'external' to control
    // which external modules to include in the bundle
    // https://github.com/rollup/rollup-plugin-node-resolve#usage
    resolve(),
    // Resolve source maps to the original source
    sourceMaps(),
  ],
}
