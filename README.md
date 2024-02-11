# tldraw physics
This repo demonstrates a simple physics integration with [tldraw](https://github.com/tldraw/tldraw). It uses [Rapier](https://rapier.rs), a rust-based physics engine compiled to [WASM](https://webassembly.org)

https://github.com/OrionReed/tldraw-physics/assets/16704290/0967881e-1faa-46fb-8204-7b99a5a3556b

## Setup
```bash
yarn install
yarn dev
```
Then go to `http://localhost:5173` in your browser.

Multiplayer is supported* using yjs and partykit. To deploy:
```bash
yarn deploy
```

*Note that this is a _terrible_ way to do multiplayer and there is no handling for multiple clients with overlapping physics sims. It's essentially the same as a single client manually moving many shapes each frame, but it sure is fun! If you find it's stalling on "Connecting..." you can disable multipayer by commenting out line 22 in App.tsx (store={store}). PRs for multiplayer fixes are **very** welcome!

## Usage
1. Select shapes you wish to include in the physics simulation
2. Click the "Physics" button (or hit "P")
3. Watch it go brrrrrrrrrr!
4. Click "Physics" again to stop the simulation

**Rules**
Supported shapes are Geo, Draw, Image and Video. Physical properties are determined by the shape's props:
- Black: Static Collider
- Grey: Zero gravity
- Blue: Zero friction (i.e. ice)
- Orange: High restitution coefficient (i.e. bouncy rubber)
- Violet: character controller (move with arrow keys) - 
- All other colors: Normal rigidbody with gravity
- No color (e.g. image or video): Static collider

**Groups**
You can group shapes to create compound rigidbodies. Physical properties will still work, so you can create shapes which are part ice and part rubber, for example.

**Notes and Gotchas**
- All geo shapes are treated as [convex hulls](https://en.wikipedia.org/wiki/Convex_hull)
- Draw shapes use a very crude compound collider approach, where each vertex is turned into a sphere
- There is no edge to the world, so rigidbodies will fall forever

# Contributing
Please open an issue or PR if you have any suggestions or improvements! Especially looking for:
- Architecture improvements, refactoring, and simplification
- Compound collider creation for DrawShapes (using a series of rectangles between points instead of spheres at points)
- Performance improvements (and identifying performance bottlenenecks)
- Bugfixes!!

## Known Issues (fixes welcome!)
- Simulation speed is not always consistent
- Multiplayer hangs on connecting sometimes, for some browsers (Safari/Firefox)