export type WeatherKind = 'clear' | 'broken' | 'overcast' | 'rain' | 'storm' | 'mist';
export declare const WEATHER_NAMES: Record<WeatherKind, string>;
/** Seeded, coherent profiles. Not independent rolls for physically conflicting knobs. */
export declare function randomWeatherPreset(seed: number, layerIds?: string[]): {
    kind: WeatherKind;
    name: string;
    parameters: import("./types").AtmosphereParameters;
};
