# Features

Each domain lives in its own folder with a public API in `index.ts`:

```
features/
  example/
    index.ts      # public exports
    components/
    actions.ts
```

Import from other layers: `import { ... } from "@/features/example"`.
