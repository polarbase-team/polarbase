import { DataType, FIELD_ICON_MAP } from '../field.interface';
import { Field } from '../field.object';
import { ReferenceData, ReferenceFieldConfig, ReferenceResources } from './field.interface';

export const getReferenceValue = (data: ReferenceData) => {
  return typeof data === 'object' ? data?.['id'] : data;
};

export const getReferenceDisplayLabel = (data: ReferenceData) => {
  // Return placeholder if input is invalid
  if (!data || typeof data !== 'object') return data;

  // 1. High-priority keys (standard naming conventions for display labels)
  const priorityKeys = ['name', 'display_name', 'title', 'label', 'full_name', 'username'];

  // Look for the first key that exists and contains a string
  for (const key of priorityKeys) {
    if (data[key] && typeof data[key] === 'string') {
      return data[key];
    }
  }

  // 2. Intelligent filtering for fallback keys
  // Exclude technical, boolean, and sensitive fields
  const blacklist = [
    'id',
    'uuid',
    'at',
    'by',
    'is_',
    'has_',
    'url',
    'website',
    'link',
    'phone',
    'email',
    'address',
  ];

  const fallbackKey = Object.keys(data).find((key) => {
    const value = data[key];
    const isString = typeof value === 'string';

    // Check if the key name contains any forbidden keywords
    const isTechnical = blacklist.some((word) => key.toLowerCase().includes(word));

    // Ensure the text isn't too long (prevents using descriptions/content as labels)
    const isShortEnough = isString && value.length < 100;

    return isString && !isTechnical && isShortEnough;
  });

  // 3. Final Fallback Strategy:
  // Use found fallback -> then specific contact info -> then raw ID -> finally "Unknown"
  return data[fallbackKey] || data['email'] || data['id'] || 'Unknown';
};

export const parseReferenceData = (data: ReferenceData) => {
  const value = getReferenceValue(data);
  const displayLabel = getReferenceDisplayLabel(data);

  return { value, displayLabel };
};

export class ReferenceField extends Field<ReferenceData> {
  static readonly dataType: DataType = DataType.Reference;

  readonly dataType: DataType = DataType.Reference;
  readonly icon: string = FIELD_ICON_MAP[DataType.Reference];

  referenceTo?: string;
  resources?: ReferenceResources;

  constructor(config: ReferenceFieldConfig) {
    super(config);

    this.referenceTo = config.referenceTo;
    this.resources = config.resources;
  }

  override toString(data: ReferenceData = this.data) {
    return String(getReferenceValue(data));
  }
}
