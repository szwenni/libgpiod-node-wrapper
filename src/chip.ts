import { z } from 'zod';
import bindings from 'bindings';
import { Line } from './line.js';
import * as fs from 'fs';
import * as path from 'path';

// Load native addon
const addon = bindings('gpiod2');

// Validation schema for chip constructor
const chipSchema = z.object({
  name: z.string().min(1)
});

/**
 * Represents a GPIO chip
 */
export class Chip {
  private _nativeChip: any;
  private _name: string;
  private _lines: Map<number, Line> = new Map();

  /**
   * Creates a new Chip instance
   * @param name The name of the GPIO chip (e.g., 'gpiochip0')
   */
  constructor(name: string) {
    const { name: validatedName } = chipSchema.parse({ name });
    this._name = validatedName;
    this._nativeChip = new addon.Chip(validatedName);
  }

  /**
   * Gets a list of available GPIO chips in the system
   * @returns Array of chip paths (e.g., ['/dev/gpiochip0', '/dev/gpiochip1'])
   */
  static getChips(): string[] {
    try {
      // Look for GPIO chip devices in /dev
      const devDir = '/dev';
      const files = fs.readdirSync(devDir);
      
      // Filter for gpiochip devices
      const chipFiles = files.filter(file => file.startsWith('gpiochip'));
      
      // Return full paths
      return chipFiles.map(file => path.join(devDir, file));
    } catch (error) {
      console.error('Error finding GPIO chips:', error);
      return [];
    }
  }

  /**
   * Gets the name of the chip
   */
  get name(): string {
    return this._name;
  }

  /**
   * Gets the label of the chip (descriptive name)
   */
  get label(): string {
    return this._nativeChip.getLabel();
  }

  /**
   * Gets the number of lines on the chip
   */
  get numLines(): number {
    return this._nativeChip.getNumLines();
  }

  /**
   * Gets a line from the chip
   * @param offset The offset of the line
   * @returns A Line instance
   */
  getLine(offset: number): Line {
    // Check if we already have a Line instance for this offset
    if (this._lines.has(offset)) {
      return this._lines.get(offset)!;
    }

    // Create a new Line instance
    const line = new Line(this, offset);
    this._lines.set(offset, line);
    return line;
  }

  /**
   * Gets multiple lines from the chip
   * @param offsets An array of line offsets
   * @returns An array of Line instances
   */
  getLines(offsets: number[]): Line[] {
    return offsets.map(offset => this.getLine(offset));
  }

  /**
   * Gets information about a line
   * @param offset The offset of the line
   * @returns An object with line information
   */
  getLineInfo(offset: number): {
    name: string;
    used: boolean;
    direction: string;
    activeLow: boolean;
    consumer: string;
  } {
    try {
      return this._nativeChip.getLineInfo(offset);
    } catch (error) {
      throw new Error(`Failed to get line info for offset ${offset}: ${error}`);
    }
  }

  /**
   * Closes the chip and releases all resources
   */
  close(): void {
    // Release all lines
    for (const line of this._lines.values()) {
      line.unexport();
    }
    this._lines.clear();

    // Close the native chip
    this._nativeChip.close();
  }

  /**
   * Gets the native chip instance (for internal use)
   */
  get nativeChip(): any {
    return this._nativeChip;
  }
}
