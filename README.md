# High-level programming language for generative biology

## Versions

Old iterations of the visual programming language are archived within the branches:

-   `v1-tree`: Version 1, a syntax tree (corresponding to a set of nonterminal and terminal production rules) based off of the [original paper](https://www.biorxiv.org/content/10.1101/2022.12.21.521526v1.full)
-   `v2-factor-graph`: Version 2, a factor graph in which one set of nodes corresponds to random variables, another set of nodes corresponds to factors, and edges connect variables to their factors
-   `v3-linear`: First pass at Version 3, linear viewer & editor inspired by interfaces biologists are used to
-   (Current) `v3.5`: Upgrade on initial v3 with improved segment blocks like LEGOs for building biological constructs

## Getting started

1. Install dependencies

```bash
npm i --legacy-peer-deps
```

2. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Organization

-   `src/`: Main container of code inside the app
-   `src/api`: Main configuration for API interactions
-   `src/app/`: Main directory of screens/pages, API endpoints, etc. per Next.js App Router
-   `src/app/globals.css`: Site-wide styles
-   `src/assets/`: Static assets like images and fonts (internal)
-   `src/components/`: Components like buttons, inputs, etc. (organized in folders corresponding to screen name)
-   `src/context/`: Contexts for state management
-   `src/lib/`: Utility functions
-   `src/types/`: TypeScript interfaces and types
-   `public/`: Static assets like images (external)
