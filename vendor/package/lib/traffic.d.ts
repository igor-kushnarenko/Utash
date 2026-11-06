export interface AirVehicle {
    x: number;
    y: number;
    dx: number;
    dy: number;
    kind: number;
    variant: number;
    tint: number;
}
export declare function routeCount(rank: number): 4 | 6;
/** Authored corridors in source-image coordinates; slopes give vehicle headings. */
export declare function airRoute(route: number, x: number, width: number, height: number): {
    y: number;
    slope: number;
};
/** At most 60 distant or 24 middle sprites; evaluated once per frame on CPU. */
export declare function sampleTraffic(width: number, height: number, rank: number, time: number, density: number, seed: number): AirVehicle[];
export declare function sampleCloseTraffic(width: number, height: number, time: number, density: number, seed: number): AirVehicle[];
