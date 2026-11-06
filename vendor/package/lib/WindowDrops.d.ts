export interface GlassDrop {
    x: number;
    y: number;
    mass: number;
    speed: number;
    phase: number;
}
/** Small seeded, fixed-step simulation; mass is conserved when droplets merge. */
export declare class WindowDrops {
    private width;
    private height;
    drops: GlassDrop[];
    private state;
    private accumulator;
    constructor(width: number, height: number, seed: number);
    private random;
    reset(seed: number): void;
    update(dt: number, rain: number): void;
    private step;
}
