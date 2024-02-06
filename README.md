# tldraw physics
This repo demonstrates a simple physics integration with [tldraw](https://github.com/tldraw/tldraw). It uses Rapier, a rust-based physics engine compiled to [WASM](https://webassembly.org)

![demo](/demo.mp4)

## Setup
```bash
yarn install
yarn dev
```
Multiplayer is supported* using yjs and partykit. To deploy:
```bash
yarn deploy
```

*Note that this is a _terrible_ way to do multiplayer and there is no handling for multiple clients with overlapping physics sims. It's essentially the same as a single client manually moving many shapes each frame. If you find it's stalling on "Connecting..." you can disable multipayer by commenting out line 22 in App.tsx (store={store}). PRs for multiplayer fixes are **very** welcome!

## Usage
1. Select shapes you wish to include in the physics simulation
2. Click the "Physics" button
3. Watch it go brrrrrrrrrr!
4. Click "Physics" again to stop the simulation

### Rules
Currently, only GeoShapes and DrawShapes are supported. Physical properties are determined by the shape's props. The following are supported:
- Grey/Black: Static Collider
- All other colors: Rigidbody with gravity

**Special Props**
- Blue: Zero friction (i.e. ice)
- Orange: High restitution coefficient (i.e. bouncy rubber)
- Violet: character controller (move with arrow keys) - only works with oval shape for now

**Groups**
You can group shapes to create compound rigidbodies. Physical properties will still work, so you can create shapes which are part ice and part rubber, for example.

## Known Issues
- Simulation speed is not always consistent
- Multiplayer hangs on connecting sometimes, for some browsers (Safari/Firefox)

# Contributing
Please open an issue or PR if you have any suggestions or improvements! Especially looking for:
- Architecture improvements (the current implementation is... not great to say the least)
- Better multiplayer support (There is a bug which stalls on "Connecting..." )
- Bugfixes!!