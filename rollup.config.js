import pkg from './package.json';

const { name } = pkg;

const esModule = false;
const sourcemap = true;

export default {
  input: './src/index.js',
  output: [
    { file: `dist/${name}.js`, format: "cjs", esModule, sourcemap },
    { file: `dist/${name}-esm.js`, format: "esm", esModule, sourcemap },
    { file: `dist/${name}-umd.js`, format: "umd", esModule, sourcemap, name },
  ]
}