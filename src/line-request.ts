import { z } from 'zod';
import bindings from 'bindings';
import { Chip } from './chip.js';
import { LineConfig } from './line-config.js';

// Load native addon
const addon = bindings('gpiod2');

// Validation schema for line request constructor
const lineRequestSchema = z.object({
  offsets: z.array(z.number().int().nonnegative()).min(1)
});

/**
 * Request for GPIO lines
 */
export class LineRequest {
  private _nativeRequest: any;
  private _chip: Chip;
  private _offsets: number[];
  private _config: LineConfig;

  /**
   * Creates a new LineRequest instance
   * @param chip The chip to request lines from
   * @param offsets The offsets of the lines to request
   * @param config The configuration for the lines
   */
  constructor(chip: Chip, offsets: number[], config: LineConfig) {
    const { offsets: validatedOffsets } = lineRequestSchema.parse({ offsets });
    
    this._chip = chip;
    this._offsets = validatedOffsets;
    this._config = config;
    this._nativeRequest = new addon.LineRequest(
      chip.nativeChip,
      validatedOffsets,
      config.nativeConfig
    );
  }

  /**
   * Gets the offsets of the requested lines
   */
  get offsets(): number[] {
    return [...this._offsets];
  }

  /**
   * Gets the value of a line
   * @param offset The offset of the line
   * @returns The value of the line
   */
  getValue(offset: number): number {
    return this._nativeRequest.getValue(offset);
  }

  /**
   * Sets the value of a line
   * @param offset The offset of the line
   * @param value The value to set
   */
  setValue(offset: number, value: number): void {
    this._nativeRequest.setValue(offset, value);
  }

  /**
   * Releases the request
   */
  release(): void {
    this._nativeRequest.release();
  }

  /**
   * Gets the native request instance (for internal use)
   */
  get nativeRequest(): any {
    return this._nativeRequest;
  }
}
