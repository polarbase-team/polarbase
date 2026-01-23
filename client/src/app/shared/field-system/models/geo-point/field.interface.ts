import { FieldConfig } from '../field.interface';

export type GeoPointData = { x: number; y: number } | string;
export interface GeoPointFieldConfig extends FieldConfig<GeoPointData> {}
