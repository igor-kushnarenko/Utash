export interface SpriteLight {
    x: number;
    y: number;
    radius: number;
    intensity: number;
    color: readonly [number, number, number];
}
export interface SpriteLightingState {
    ambient: number;
    transmission?: number;
    minimumAmbient?: number;
    lights: readonly SpriteLight[];
}
export declare function windowTransmission(closed: number): number;
/** Coordinates and radii use the same scene pixel space as the sprite. */
export declare function sampleSpriteLight(x: number, y: number, u: number, state: SpriteLightingState): [number, number, number];
/** A low-resolution light field is interpolated over native, nearest-sampled albedo.
 * Emissive screen/keyboard/dial remain separate siblings and are never multiplied. */
export declare function createSpriteMaterial(image: HTMLImageElement, width: number, height: number): {
    canvas: HTMLCanvasElement;
    update(x: number, bottom: number, state: SpriteLightingState): void;
    dispose(): void;
};
