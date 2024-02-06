import RAPIER from "@dimforge/rapier2d";
import { TLShape, TLShapeId } from "@tldraw/tldraw";

export type BodyWithShapeData = RAPIER.RigidBody & {
  userData: { id: TLShapeId; type: TLShape["type"]; w: number; h: number };
};
export type RigidbodyLookup = { [key: TLShapeId]: RAPIER.RigidBody };
