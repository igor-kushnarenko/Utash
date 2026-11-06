import type { TextureSource } from './types';
export interface LayerShadowGeometry {
    /** Physical plane height, independent of drawing depth; same units as scene pixels. */
    elevation: number;
    casts?: boolean;
    receives?: boolean;
    /** Optional local red × alpha silhouette. Defaults to the source image's alpha. */
    casterMask?: TextureSource;
    /** Optional local red × alpha receiving mask. Defaults to the source alpha. */
    receiverMask?: TextureSource;
    opacity?: number;
}
interface LightBase {
    id: string;
    color: readonly [number, number, number];
    intensity: number;
    scope?: 'world' | 'room';
    enabled?: boolean;
    /** Penumbra radius in logical receiver pixels; stable five-tap filter. */
    softness?: number;
}
export interface DirectionalShadowLight extends LightBase {
    type: 'directional';
    /** Direction TOWARD the source: 0=right, 90=down in screen coordinates. */
    azimuthDeg: number;
    elevationDeg: number;
    /** Bounds the projection near the horizon, in logical pixels. */
    maxDistance?: number;
}
export interface PointShadowLight extends LightBase {
    type: 'point';
    x: number;
    y: number;
    elevation: number;
    radius: number;
}
export type ShadowLight = DirectionalShadowLight | PointShadowLight;
export interface ShadowLightingState {
    enabled: boolean;
    ambient: number;
    lights: readonly ShadowLight[];
}
export declare const MAX_SHADOW_LIGHTS = 4;
export declare const MAX_SHADOW_CASTERS = 4;
/** Validate first, then return an owned copy so failed edits cannot mutate the renderer. */
export declare function resolveShadowLighting(value: ShadowLightingState): ShadowLightingState;
/** Inverse project a receiver point onto a parallel caster plane; null means no blocker. */
export declare function projectShadowSample(x: number, y: number, receiver: number, caster: number, light: ShadowLight): [number, number] | null;
/** Inject only on opt-in image/room passes; emissive additions stay after this surface term. */
export declare function withShadowLighting(fragment: string): string;
export {};
