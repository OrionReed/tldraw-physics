import { BaseCollection } from '../../tldraw-collections/src';
import RAPIER from "@dimforge/rapier2d";
import { Editor, Geometry2d, TLDrawShape, TLGeoShape, TLGroupShape, TLShape, TLShapeId, VecLike } from "@tldraw/tldraw";
import {
  centerToCorner,
  convertVerticesToFloat32Array,
  shouldConvexify,
  cornerToCenter, getDisplacement, CHARACTER, GRAVITY, MATERIAL, getFrictionFromColor, getGravityFromColor, getRestitutionFromColor, isRigidbody, getShapeDimensions
} from "./utils";

type BodyWithShapeData = RAPIER.RigidBody & {
  userData: { id: TLShapeId; type: TLShape["type"]; w: number; h: number };
};

export class PhysicsCollection extends BaseCollection {
  override id = 'physics';
  private world: RAPIER.World;
  private rigidbodyLookup: Map<TLShapeId, RAPIER.RigidBody>;
  private colliderLookup: Map<TLShapeId, RAPIER.Collider>;
  private characterLookup: Map<TLShapeId, { controller: RAPIER.KinematicCharacterController, id: TLShapeId }>;
  private animFrame = -1; // Store the animation frame id

  constructor(editor: Editor) {
    super(editor)
    this.world = new RAPIER.World(GRAVITY)
    this.rigidbodyLookup = new Map()
    this.colliderLookup = new Map()
    this.characterLookup = new Map()
    this.simStart()
  }

  override onAdd(shapes: TLShape[]) {
    for (const shape of shapes) {
      if ('color' in shape.props && shape.props.color === "violet") {
        this.createCharacterObject(shape as TLGeoShape);
        continue;
      }

      switch (shape.type) {
        case "geo":
        case "image":
        case "video":
          this.createShape(shape as TLGeoShape);
          break;
        case "draw":
          this.createCompoundLineObject(shape as TLDrawShape);
          break;
        case "group":
          this.createGroupObject(shape as TLGroupShape);
          break;
        // Add cases for any new shape types here
      }
    }
  }

  override onRemove(shapes: TLShape[]) {
    for (const shape of shapes) {
      if (this.rigidbodyLookup.has(shape.id)) {
        const rb = this.rigidbodyLookup.get(shape.id);
        if (!rb) continue;
        this.world.removeRigidBody(rb);
        this.rigidbodyLookup.delete(shape.id);
      }
      if (this.colliderLookup.has(shape.id)) {
        const col = this.colliderLookup.get(shape.id);
        if (!col) continue;
        this.world.removeCollider(col, true);
        this.colliderLookup.delete(shape.id);
      }
      if (this.characterLookup.has(shape.id)) {
        const char = this.characterLookup.get(shape.id);
        if (!char) continue;
        this.world.removeCharacterController(char.controller);
        this.characterLookup.delete(shape.id);
      }
    }
  }

  override onShapeChange(prev: TLShape, next: TLShape) {

  }

  public simStart() {
    this.world = new RAPIER.World(GRAVITY);

    const simLoop = () => {
      this.world.step();
      this.updateCharacterControllers();
      this.updateRigidbodies();
      this.animFrame = requestAnimationFrame(simLoop);
    };
    simLoop();
    return () => cancelAnimationFrame(this.animFrame);
  };

  public simStop() {
    if (this.animFrame !== -1) {
      cancelAnimationFrame(this.animFrame);
      this.animFrame = -1;
    }
  }

  addCollider(id: TLShapeId, desc: RAPIER.ColliderDesc, parentRigidBody?: RAPIER.RigidBody): RAPIER.Collider {
    const col = this.world.createCollider(desc, parentRigidBody);
    col && this.colliderLookup.set(id, col);
    return col;
  }

  addRigidbody(id: TLShapeId, desc: RAPIER.RigidBodyDesc) {
    const rb = this.world.createRigidBody(desc);
    rb && this.rigidbodyLookup.set(id, rb);
    return rb;
  }

  addCharacter(id: TLShapeId): RAPIER.KinematicCharacterController {
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
    this.characterLookup.set(id, { controller: char, id });
    return char;
  }

  createShape(shape: TLGeoShape | TLDrawShape) {
    if (shape.props.dash === "dashed") return; // Skip dashed shapes
    if (isRigidbody(shape.props.color)) {
      const gravity = getGravityFromColor(shape.props.color)
      const rb = this.createRigidbodyObject(shape, gravity);
      this.createColliderObject(shape, rb);
    } else {
      this.createColliderObject(shape);
    }
  }

  createCharacterObject(characterShape: TLGeoShape) {
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
    rigidBodyDesc.userData = {
      id: characterShape.id,
      type: characterShape.type,
      w: characterShape.props.w,
      h: characterShape.props.h,
    };
    const rb = this.addRigidbody(characterShape.id, rigidBodyDesc);
    const col = this.addCollider(characterShape.id, colliderDesc, rb);
    this.addCharacter(characterShape.id);
  }

  createGroupObject(group: TLGroupShape) {
    // create rigidbody for group
    const rigidbody = this.createRigidbodyObject(group);
    const rigidbodyGeometry = this.editor.getShapeGeometry(group);

    this.editor.getSortedChildIdsForParent(group.id).forEach((childId) => {
      // create collider for each
      const child = this.editor.getShape(childId);
      if (!child) return;
      const isRb = "color" in child.props && isRigidbody(child?.props.color);
      if (isRb) {
        this.createColliderObject(child, rigidbody, rigidbodyGeometry);
      } else {
        this.createColliderObject(child);
      }
    });
  }

  createCompoundLineObject(drawShape: TLDrawShape) {
    const rigidbody = this.createRigidbodyObject(drawShape);
    const drawnGeo = this.editor.getShapeGeometry(drawShape);
    const verts = drawnGeo.vertices;
    const isRb =
      "color" in drawShape.props && isRigidbody(drawShape.props.color);
    verts.forEach((point) => {
      if (isRb) this.createColliderRelativeToParentObject(point, drawShape, rigidbody);
      else this.createColliderRelativeToParentObject(point, drawShape);
    });
  }

  private createRigidbodyObject(
    shape: TLShape,
    gravity = 1,
  ): RAPIER.RigidBody {
    const shapeGeo = this.editor.getShapeGeometry(shape)
    const dimensions = getShapeDimensions(shapeGeo);
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
    rigidBodyDesc.userData = {
      id: shape.id,
      type: shape.type,
      w: dimensions.width,
      h: dimensions.height,
    };
    const rigidbody = this.addRigidbody(shape.id, rigidBodyDesc);
    return rigidbody;
  }

  private createColliderRelativeToParentObject(
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
      this.addCollider(relativeToParent.id, colliderDesc, parentRigidBody);
    } else {
      colliderDesc.setTranslation(
        relativeToParent.x + center.x,
        relativeToParent.y + center.y,
      );
      this.addCollider(relativeToParent.id, colliderDesc);
    }
  }
  private createColliderObject(
    shape: TLShape,
    parentRigidBody: RAPIER.RigidBody | null = null,
    parentGeo: Geometry2d | null = null,
  ) {
    const shapeGeo = this.editor.getShapeGeometry(shape);
    const dimensions = getShapeDimensions(shapeGeo);
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
        : MATERIAL.defaultRestitution;
    const friction =
      "color" in shape.props
        ? getFrictionFromColor(shape.props.color)
        : MATERIAL.defaultFriction;

    let colliderDesc: RAPIER.ColliderDesc | null = null;

    if (shouldConvexify(shape)) {
      // Convert vertices for convex shapes
      const vertices = shapeGeo.vertices;
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
      this.addCollider(shape.id, colliderDesc, parentRigidBody);
    } else {
      colliderDesc
        .setTranslation(centerPosition.x, centerPosition.y)
        .setRotation(shape.rotation);
      this.addCollider(shape.id, colliderDesc);
    }
  }

  updateRigidbodies() {
    this.world.bodies.forEach((rb) => {
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

    for (const char of this.characterLookup.values()) {
      const charRigidbody = this.rigidbodyLookup.get(char.id) as BodyWithShapeData;
      const charCollider = this.colliderLookup.get(char.id) as RAPIER.Collider;
      const grounded = char.controller.computedGrounded();
      // TODO: move this check so we can think about multiplayer physics control
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

      char.controller.computeColliderMovement(
        charCollider as RAPIER.Collider,
        new RAPIER.Vector2(displacement.x, displacement.y),
      );
      const correctedDisplacement = char.controller.computedMovement();
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
    };
  }
}