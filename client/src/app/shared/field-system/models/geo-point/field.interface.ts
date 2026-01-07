import { FieldConfig } from '../field.interface';

export const GeoPointPattern =
  /^\(?(-?([1-8]?\d(\.\d+)?|90(\.0+)?)),\s*(-?((1[0-7]\d|[1-9]?\d)(\.\d+)?|180(\.0+)?))\)?$/;
export type GeoPoint = { x: number; y: number };
export type GeoPointData = string | GeoPoint;
export interface GeoPointFieldConfig extends FieldConfig<GeoPointData> {}
