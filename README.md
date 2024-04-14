# tldraw physics
This repo demonstrates a simple physics integration with [tldraw](https://github.com/tldraw/tldraw). It uses [Rapier](https://rapier.rs), a rust-based physics engine compiled to [WASM](https://webassembly.org). It also uses a simple PoC 'Collections' system for TLDraw which can be found [here](https://github.com/OrionReed/tldraw-physics/tree/main/tldraw-collections). Try it out [in your browser](https://orionreed.github.io/tldraw-physics/).


https://github.com/OrionReed/tldraw-physics/assets/16704290/0967881e-1faa-46fb-8204-7b99a5a3556b


## Usage
- Hitting 'P' adds/removes all shapes from the physics simulation.
- Select some shapes and hit the 'Add' or 'Remove' buttons to add/remove only those shapes
- Hit the '🔦' button to highlight the shapes in the physics simulation (this uses tldraw's hinting, it's quite subtle)
- The number of shapes currently in the sim is shown at the top
- When a shape is selected it is made kinematic, i.e. it will no longer move from forces and will only move if you move it.

#### Rules
All shapes can be colliders, but only Geo and Draw shapes can be rigidbodies (this is an arbitrary choice). Physical properties are determined by the shape's color:
- Black: Static Collider
- Grey: Zero gravity
- Blue: Zero friction (i.e. ice)
- Orange: High restitution coefficient (i.e. bouncy rubber)
- Violet: character controller (move with arrow keys) - 
- All other colors: Normal rigidbody with gravity

#### Groups
You can group shapes to create compound rigidbodies. Physical properties are still per-shape, so you can create shapes which are part ice and part rubber, for example. The center of mass is calculated based on the shapes' positions and areas and assumes all shapes are the same density.

#### Notes and Gotchas
- All geo shapes are treated as [convex hulls](https://en.wikipedia.org/wiki/Convex_hull)
- Draw shapes use a very crude compound collider approach, where each vertex is turned into a sphere
- There is no edge to the world, so rigidbodies will fall forever

## Development
```bash
yarn install
yarn dev
```
Then go to `http://localhost:5173` in your browser.

Multiplayer is supported* using yjs and partykit. To deploy:
```bash
yarn deploy
```

*Note that this is a _terrible_ way to do multiplayer and there is no handling for multiple clients with overlapping physics sims. It's essentially the same as a single client manually moving many shapes each frame, but it sure is fun! I have "disabled" multiplayer by default, you can uncomment line 25 of App.tsx (`// store={store()}`) to mess around. PRs for multiplayer fixes are **very** welcome!

# Contributing
Please open an issue or PR if you have any suggestions or improvements! Especially looking for:
- Compound collider creation for DrawShapes (using a series of rectangles between points instead of spheres at points)
- Performance improvements (and identifying performance bottlenenecks)
- Bugfixes

## Known Issues (fixes welcome!)
- Simulation speed is not always consistent as it's tied to refresh rate
- Multiplayer hangs on connecting sometimes, for some browsers (Safari/Firefox)