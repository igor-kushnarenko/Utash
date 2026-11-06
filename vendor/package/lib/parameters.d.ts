import type { AtmosphereParameters, ParameterPatch, PaletteName } from './types';
export declare const DEFAULT_PARAMETERS: AtmosphereParameters;
export declare const PRESETS: Readonly<Record<string, ParameterPatch>>;
export declare function resolveParameters(patch?: ParameterPatch, base?: AtmosphereParameters): AtmosphereParameters;
export declare function getPreset(name: string): AtmosphereParameters;
export declare function parsePreset(json: string): AtmosphereParameters;
export declare function rgb(hex: string): [number, number, number];
export declare function paletteAt(time: number, palette: PaletteName): {
    top: number[];
    bottom: number[];
    cloud: number[];
    ambient: number;
};
