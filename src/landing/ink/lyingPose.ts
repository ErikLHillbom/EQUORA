// Calm lying (sternal recumbency) built from the standing pose, because the model has no lying
// clip. Legs fold under the body, the body rests on the ground, the head stays up.
// Never a rolling, collapsed or dead pose (DESIGN 7).

export interface BoneTurn {
  /** Bone name as GLTFLoader gives it (dots removed: "FrontUpperLeg.L" is "FrontUpperLegL"). */
  bone: string
  /** Local rotation axis. */
  axis: [number, number, number]
  /** Radians at full lying. */
  angle: number
}

export interface LyingPose {
  turns: BoneTurn[]
  /**
   * The cannon and hoof hang off IK controllers, not off the legs, so a folded leg would leave
   * them standing. While lying, each one rides on its lower leg, then folds by `fold` radians
   * about its local x axis.
   */
  feet: { leg: string; foot: string; fold: number }[]
}

export const LYING_POSE: LyingPose = {
  feet: [
    { leg: 'FrontLowerLegL', foot: 'IKFrontLegL', fold: -2.2 },
    { leg: 'FrontLowerLegR', foot: 'IKFrontLegR', fold: -2.2 },
    { leg: 'BackLowerLegL', foot: 'IKBackLegL', fold: 1.2 },
    { leg: 'BackLowerLegR', foot: 'IKBackLegR', fold: 1.2 },
  ],
  turns: [
    // Front legs: forearm forward, knee bent fully, cannon under the chest.
    { bone: 'FrontUpperLegL', axis: [1, 0, 0], angle: -1.4 },
    { bone: 'FrontUpperLegR', axis: [1, 0, 0], angle: -1.4 },
    { bone: 'FrontLowerLegL', axis: [1, 0, 0], angle: -2.9 },
    { bone: 'FrontLowerLegR', axis: [1, 0, 0], angle: -2.9 },
    // Hind legs: tucked forward under the belly.
    { bone: 'BackLegL', axis: [1, 0, 0], angle: -0.3 },
    { bone: 'BackLegR', axis: [1, 0, 0], angle: -0.3 },
    { bone: 'BackUpperLegL', axis: [1, 0, 0], angle: -1.2 },
    { bone: 'BackUpperLegR', axis: [1, 0, 0], angle: -1.2 },
    { bone: 'BackLowerLegL', axis: [1, 0, 0], angle: 2.4 },
    { bone: 'BackLowerLegR', axis: [1, 0, 0], angle: 2.4 },
    // Neck a little lower, head level: resting and alert.
    { bone: 'Neck1', axis: [1, 0, 0], angle: 0.15 },
    { bone: 'Head', axis: [1, 0, 0], angle: -0.1 },
  ],
}
