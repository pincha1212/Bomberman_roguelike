# Bomberman Roguelike (React + TypeScript + Vite)

A procedural Bomberman roguelike rewritten as a modern React application.

## Features

- **Procedural Dungeon Generation**: Dynamic room layout, obstacles, destructible blocks, traps, and secrets every run.
- **Roguelike Progression & Builds**: Relics, elemental bombs (Fire, Ice, Electric, Toxic, Gravity, Fragment, Pierce), stackable abilities, and synergies.
- **Boss Fights & Enemies**: Multi-phase bosses, specialized crawling and flying enemies with tactical AI behaviors.
- **11 Unique Biomes**: Real-time or depth-based biome progression (Winter, Autumn, Spring, Summer, Underground, Clouds, Mountains, Beach, Space, Sky, Inferno) with dynamic liquid surfaces and environmental weather effects.
- **Run Persistence**: Automatic run save and resume capabilities via localStorage.
- **Quality & Dev Tools**: Switchable graphics fidelity (Low, Medium, High) and God Mode toggle for testing.
- **Responsive & Mobile Ready**: Full keyboard controls (`WASD` / arrows + `Space` for bombs, `Esc`/`P` for pause) plus invisible mobile gesture and action touch zones.

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Controls

- **Move**: `W`, `A`, `S`, `D` or Arrow keys
- **Bomb**: `Space` or `Z` (tap to drop, hold for grab/throw when unlocked)
- **Pause**: `Esc` or `P`
- **Mobile**: Left half screen for directional movement, right half screen for bomb actions.
