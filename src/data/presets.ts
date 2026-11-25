import type { RegionalPreset } from '../types/air';
import { DELHI_NCR_PRESET } from './presets/delhiNcr';
import { KRAKOW_PRESET } from './presets/krakow';
import { LAHORE_PRESET } from './presets/lahore';
import { SALT_LAKE_CITY_PRESET } from './presets/saltLakeCity';

/** Registry of built-in regional winter smog scenario presets. */
export const REGIONAL_PRESETS: RegionalPreset[] = [
  DELHI_NCR_PRESET,
  SALT_LAKE_CITY_PRESET,
  KRAKOW_PRESET,
  LAHORE_PRESET,
];
