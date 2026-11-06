import type { ShutterDefinition } from './types';
/** Light order: shelf, wall, radio, computer. Defaults scale to scene dimensions. */
export declare function resolveShutter(s: ShutterDefinition, width: number, height: number, nativePeriod?: number): {
    left: number;
    right: number;
    texturePeriod: number;
    interiorLights: {
        x: number;
        y: number;
        radiusX: number;
        radiusY: number;
    }[];
    top: number;
    bottom: number;
    depth: number;
    texture?: import("./types").TextureSource;
};
