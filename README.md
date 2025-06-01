# High-level programming language for generative biology

## Archived versions

Old iterations of the visual programming language are archived within the branches:
- `v1-tree`: Version 1, a syntax tree (corresponding to a set of nonterminal and terminal production rules) based off of the [original paper](https://www.biorxiv.org/content/10.1101/2022.12.21.521526v1.full)
- `v2-factor-graph`: Version 2, a factor graph in which one set of nodes corresponds to random variables, another set of nodes corresponds to factors, and edges connect variables to their factors

## Getting started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
