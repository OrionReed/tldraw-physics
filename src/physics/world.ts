import RAPIER from "@dimforge/rapier2d";
import { CHARACTER, GRAVITY, MATERIALS, getFrictionFromColor, getGravityFromColor, getRestitutionFromColor, isRigidbody } from "./config";
import { Editor, Geometry2d, TLDrawShape, TLGeoShape, TLGroupShape, TLShape, TLShapeId, VecLike } from "@tldraw/tldraw";
import { useEffect, useRef } from "react";
import { centerToCorner, convertVerticesToFloat32Array, cornerToCenter, getDisplacement } from "./utils";

type BodyWithShapeData = RAPIER.RigidBody & {
  userData: { id: TLShapeId; type: TLShape["type"]; w: number; h: number };
};
type RigidbodyLookup = { [key: TLShapeId]: RAPIER.RigidBody };

export class PhysicsWorld {
  private editor: Editor;
  private world: RAPIER.World;
  private rigidbodyLookup: RigidbodyLookup;
  private animFrame: number | null = null; // Store the animation frame id
  private character: {
    rigidbody: RAPIER.RigidBody | null;
    collider: RAPIER.Collider | null;
  };
  constructor(editor: Editor) {
    this.editor = editor
    this.world = new RAPIER.World(GRAVITY)
    this.rigidbodyLookup = {}
    this.character = { rigidbody: null, collider: null }
  }

  public start() {
    // consider moving to constructor
    this.world = new RAPIER.World(GRAVITY);

    this.addShapes(this.editor.selectedShapes);

    let animFrame: number;
    const simLoop = () => {
      this.world.step();
      // TODO: check if character update works better before step()
      this.updateCharacterControllers();
      this.updateRigidbodies();
      this.animFrame = requestAnimationFrame(simLoop);
    };
    simLoop();
    return () => cancelAnimationFrame(animFrame);
  };

  public stop() {
    if (this.animFrame !== null) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = null;
    }
  }

  public addShapes(shapes: TLShape[]) {
    // TODO: fix this hacky casting
    for (const shape of shapes) {
      switch (shape.type) {
        case "geo": {
          const geoShape = shape as TLGeoShape;
          if (geoShape.props.color === "violet") {
            this.createCharacter(geoShape);
            break;
          }
          this.createShape(geoShape);
          break;
        }
        case "image":
        case "video":
          this.createShape(shape as TLGeoShape)
          break;
        case "draw":
          this.createCompoundLine(shape as TLDrawShape);
          break;
        case "group":
          this.createGroup(shape as TLGroupShape)
          break;
      }
    }
  }

  createShape(shape: TLGeoShape | TLDrawShape) {
    if (shape.props.dash === "dashed") return; // Skip dashed shapes
    if (isRigidbody(shape.props.color)) {
      const gravity = getGravityFromColor(shape.props.color)
      const rb = this.createRigidbody(shape, gravity);
      this.createCollider(shape, rb);
    } else {
      this.createCollider(shape);
    }
  }

  createCharacter(characterShape: TLGeoShape) {
    const initialPosition = cornerToCenter({
      x: characterShape.x,
      y: characterShape.y,
      width: characterShape.props.w,
      height: characterShape.props.h,
      rotation: characterShape.rotation,
    });
    const vertices = this.editor.getShapeGeometry(characterShape).vertices;
    const vec2Array = convertVerticesToFloat32Array(
      vertices,
      characterShape.props.w,
      characterShape.props.h,
    );
    const colliderDesc = RAPIER.ColliderDesc.convexHull(vec2Array);
    if (!colliderDesc) {
      console.error("Failed to create collider description.");
      return;
    }
    const rigidBodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(initialPosition.x, initialPosition.y)
      .setAdditionalMass(CHARACTER.additionalMass);
    const charRigidbody = this.world.createRigidBody(rigidBodyDesc);
    const charCollider = this.world.createCollider(colliderDesc, charRigidbody);
    const char = this.world.createCharacterController(0.1);
    char.setUp(CHARACTER.up);
    char.setMaxSlopeClimbAngle(CHARACTER.maxSlopeClimbAngle);
    char.setSlideEnabled(CHARACTER.slideEnabled);
    char.setMinSlopeSlideAngle(CHARACTER.minSlopeSlideAngle);
    char.setApplyImpulsesToDynamicBodies(CHARACTER.applyImpulsesToDynamicBodies);
    char.enableAutostep(
      CHARACTER.autostepHeight,
      CHARACTER.autostepMaxClimbAngle,
      true,
    );
    char.enableSnapToGround(CHARACTER.snapToGroundDistance);
    // Setup references so we can update character position in sim loop
    this.character.rigidbody = charRigidbody;
    this.character.collider = charCollider;
    charRigidbody.userData = {
      id: characterShape.id,
      type: characterShape.type,
      w: characterShape.props.w,
      h: characterShape.props.h,
    };
  }

  createGroup(group: TLGroupShape) {
    // create rigidbody for group
    const rigidbody = this.createRigidbody(group);
    const rbShapeGeo = this.editor.getShapeGeometry(group);

    this.editor.getSortedChildIdsForParent(group.id).forEach((childId) => {
      // create collider for each
      const child = this.editor.getShape(childId);
      if (!child) return;
      const isRb = "color" in child.props && isRigidbody(child?.props.color);
      if (isRb) {
        this.createCollider(child, rigidbody, rbShapeGeo);
      } else {
        this.createCollider(child);
      }
    });
  }
  createCompoundLine(drawShape: TLDrawShape) {
    const rigidbody = this.createRigidbody(drawShape);
    const drawnGeo = this.editor.getShapeGeometry(drawShape);
    const verts = drawnGeo.vertices;
    const isRb =
      "color" in drawShape.props && isRigidbody(drawShape?.props.color);
    verts.forEach((point) => {
      if (isRb) this.createColliderAtPoint(point, drawShape, rigidbody);
      else this.createColliderAtPoint(point, drawShape);
    });
  }

  updateRigidbodies() {
    this.world.bodies.forEach((rb) => {
      if (rb === this.character?.rigidbody) return;
      if (!rb.userData) return;
      const body = rb as BodyWithShapeData;
      const position = body.translation();
      const rotation = body.rotation();

      const cornerPos = centerToCorner({
        x: position.x,
        y: position.y,
        width: body.userData?.w,
        height: body.userData?.h,
        rotation: rotation,
      });

      this.editor.updateShape({
        id: body.userData?.id,
        type: body.userData?.type,
        rotation: rotation,
        x: cornerPos.x,
        y: cornerPos.y,
      });
    });
  }

  updateCharacterControllers() {
    const right = this.editor.inputs.keys.has("ArrowRight") ? 1 : 0;
    const left = this.editor.inputs.keys.has("ArrowLeft") ? -1 : 0;
    const acceleration: VecLike = {
      x: (right + left) * CHARACTER.moveAcceleration,
      y: CHARACTER.gravityMultiplier * GRAVITY.y,
    }

    this.world.characterControllers.forEach((char) => {
      if (!this.character.rigidbody || !this.character.collider) return;
      const charRigidbody = this.character.rigidbody as BodyWithShapeData;
      const charCollider = this.character.collider;
      const grounded = char.computedGrounded();
      const isJumping = this.editor.inputs.keys.has("ArrowUp") && grounded;
      const velocity: VecLike = {
        x: charRigidbody.linvel().x,
        y: isJumping ? -CHARACTER.jumpVelocity : charRigidbody.linvel().y,
      }
      const displacement = getDisplacement(
        velocity,
        acceleration,
        1 / 60,
        CHARACTER.maxMoveSpeedX,
        CHARACTER.moveDeceleration,
      );

      char.computeColliderMovement(
        charCollider as RAPIER.Collider, // The collider we would like to move.
        new RAPIER.Vector2(displacement.x, displacement.y),
      );
      const correctedDisplacement = char.computedMovement();
      const currentPos = charRigidbody.translation();
      const nextX = currentPos.x + correctedDisplacement.x;
      const nextY = currentPos.y + correctedDisplacement.y;
      charRigidbody?.setNextKinematicTranslation({ x: nextX, y: nextY });

      const w = charRigidbody.userData.w;
      const h = charRigidbody.userData.h;
      this.editor.updateShape({
        id: charRigidbody.userData.id,
        type: charRigidbody.userData.type,
        x: nextX - w / 2,
        y: nextY - h / 2,
      });
    });
  }
  private getShapeDimensions(
    shape: TLShape,
  ): { width: number; height: number } {
    const geo = this.editor.getShapeGeometry(shape);
    const width = geo.center.x * 2;
    const height = geo.center.y * 2;
    return { width, height };
  }
  private shouldConvexify(shape: TLShape): boolean {
    return !(
      shape.type === "geo" && (shape as TLGeoShape).props.geo === "rectangle"
    );
  }
  private createRigidbody(
    shape: TLShape,
    gravity = 1,
  ): RAPIER.RigidBody {
    const dimensions = this.getShapeDimensions(shape);
    const centerPosition = cornerToCenter({
      x: shape.x,
      y: shape.y,
      width: dimensions.width,
      height: dimensions.height,
      rotation: shape.rotation,
    });
    const rigidBodyDesc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(centerPosition.x, centerPosition.y)
      .setRotation(shape.rotation)
      .setGravityScale(gravity);
    const rigidbody = this.world.createRigidBody(rigidBodyDesc);
    this.rigidbodyLookup[shape.id] = rigidbody;
    rigidbody.userData = {
      id: shape.id,
      type: shape.type,
      w: dimensions.width,
      h: dimensions.height,
    };
    return rigidbody;
  }
  private createColliderAtPoint(
    point: VecLike,
    relativeToParent: TLDrawShape,
    parentRigidBody: RAPIER.RigidBody | null = null,
  ) {
    const radius = 5;
    const parentGeo = this.editor.getShapeGeometry(relativeToParent);
    const center = cornerToCenter({
      x: point.x,
      y: point.y,
      width: radius,
      height: radius,
      rotation: 0,
      parent: parentGeo,
    });
    let colliderDesc: RAPIER.ColliderDesc | null = null;
    colliderDesc = RAPIER.ColliderDesc.ball(radius);

    if (!colliderDesc) {
      console.error("Failed to create collider description.");
      return;
    }

    if (parentRigidBody) {
      colliderDesc.setTranslation(center.x, center.y);
      this.world.createCollider(colliderDesc, parentRigidBody);
    } else {
      colliderDesc.setTranslation(
        relativeToParent.x + center.x,
        relativeToParent.y + center.y,
      );
      this.world.createCollider(colliderDesc);
    }
  }
  private createCollider(
    shape: TLShape,
    parentRigidBody: RAPIER.RigidBody | null = null,
    parentGeo: Geometry2d | null = null,
  ) {
    const dimensions = this.getShapeDimensions(shape);

    const centerPosition = cornerToCenter({
      x: shape.x,
      y: shape.y,
      width: dimensions.width,
      height: dimensions.height,
      rotation: shape.rotation,
      parent: parentGeo || undefined,
    });

    const restitution =
      "color" in shape.props
        ? getRestitutionFromColor(shape.props.color)
        : MATERIALS.defaultRestitution;
    const friction =
      "color" in shape.props
        ? getFrictionFromColor(shape.props.color)
        : MATERIALS.defaultFriction;

    let colliderDesc: RAPIER.ColliderDesc | null = null;

    if (this.shouldConvexify(shape)) {
      // Convert vertices for convex shapes
      const vertices = this.editor.getShapeGeometry(shape).vertices;
      const vec2Array = convertVerticesToFloat32Array(
        vertices,
        dimensions.width,
        dimensions.height,
      );
      colliderDesc = RAPIER.ColliderDesc.convexHull(vec2Array);
    } else {
      // Cuboid for rectangle shapes
      colliderDesc = RAPIER.ColliderDesc.cuboid(
        dimensions.width / 2,
        dimensions.height / 2,
      );
    }
    if (!colliderDesc) {
      console.error("Failed to create collider description.");
      return;
    }

    colliderDesc
      .setRestitution(restitution)
      .setRestitutionCombineRule(RAPIER.CoefficientCombineRule.Max)
      .setFriction(friction)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min);
    if (parentRigidBody) {
      if (parentGeo) {
        colliderDesc.setTranslation(centerPosition.x, centerPosition.y);
        colliderDesc.setRotation(shape.rotation);
      }
      this.world.createCollider(colliderDesc, parentRigidBody);
    } else {
      colliderDesc
        .setTranslation(centerPosition.x, centerPosition.y)
        .setRotation(shape.rotation);
      this.world.createCollider(colliderDesc);
    }
  }
  public setEditor(editor: Editor) {
    this.editor = editor;
  }
}

export const physicsSim = (editor: Editor, enabled: boolean) => {
  const sim = useRef<PhysicsWorld>(new PhysicsWorld(editor));
  useEffect(() => {
    if (enabled) {
      sim.current.start();
      return;
    }
    sim.current.stop();
  }, [enabled]);
  useEffect(() => {
    sim.current.setEditor(editor);
  }, [editor]);
}