import { z } from 'zod';
import { EventEmitter } from 'events';
import bindings from 'bindings';
import { Chip } from './chip.js';
import { Direction, Edge, Value, Drive, Bias } from './enums.js';
import { LineConfig } from './line-config.js';
import { LineRequest } from './line-request.js';

// Load native addon
const addon = bindings('gpiod2-node-gyp');

// Validation schema for line constructor
const lineSchema = z.object({
  offset: z.number().int().nonnegative()
});

/**
 * Represents a GPIO line
 */
export class Line extends EventEmitter {
  private _nativeLine: any;
  private _chip: Chip;
  private _offset: number;
  private _direction: Direction = Direction.INPUT;
  private _value: Value = Value.LOW;
  private _edge: Edge = Edge.NONE;
  private _drive: Drive = Drive.PUSH_PULL;
  private _bias: Bias = Bias.DISABLED;
  private _isWatching: boolean = false;
  private _isExported: boolean = false;
  private _config: LineConfig | null = null;
  private _request: LineRequest | null = null;
  private _debouncePeriod: number = 1000;
  private _activeLow: boolean = false;

  /**
   * Creates a new Line instance
   * @param chip The chip this line belongs to
   * @param offset The offset of the line
   */
  constructor(chip: Chip, offset: number) {
    super();
    const { offset: validatedOffset } = lineSchema.parse({ offset });
    
    this._chip = chip;
    this._offset = validatedOffset;
    this._nativeLine = new addon.Line(chip.nativeChip, validatedOffset);
  }

  /**
   * Gets the offset of the line
   */
  get offset(): number {
    return this._offset;
  }

  /**
   * Gets the direction of the line
   */
  get direction(): Direction {
    return this._direction;
  }

  /**
   * Gets the current value of the line
   */
  get value(): Value {
    if (!this._isExported) {
      throw new Error('Line is not exported');
    }
    return this._nativeLine.getValue();
  }

  /**
   * Sets the direction of the line
   * @param direction The direction to set
   */
  setDirection(direction: Direction): void {
    this._direction = direction;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setDirection(direction);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Sets the value of the line
   * @param value The value to set
   */
  setValue(value: Value): void {
    if (!this._isExported) {
      throw new Error('Line is not exported');
    }
    
    if (this._direction !== Direction.OUTPUT) {
      throw new Error('Cannot set value on input line');
    }
    
    this._nativeLine.setValue(value);
    this._value = value;
  }

  /**
   * Gets the current value of the line
   * @returns The current value
   */
  getValue(): Value {
    if (!this._isExported) {
      throw new Error('Line is not exported');
    }
    
    const value = this._nativeLine.getValue();
    this._value = value;
    return value;
  }

  /**
   * Sets the edge detection mode
   * @param edge The edge detection mode
   */
  setEdge(edge: Edge): void {
    this._edge = edge;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setEdge(edge);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Sets the drive mode
   * @param drive The drive mode
   */
  setDrive(drive: Drive): void {
    this._drive = drive;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setDrive(drive);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Sets the debounce period
   * @param debouncePeriod The debounce period
   */
  setDebouncePeriod(debouncePeriod: number): void {
    this._debouncePeriod = debouncePeriod;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setDebouncePeriod(debouncePeriod);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Sets the debounce period
   * @param debouncePeriod The debounce period
   */
  setActiveLow(activeLow: boolean): void {
    this._activeLow = activeLow;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setActiveLow(activeLow);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Sets the bias mode
   * @param bias The bias mode
   */
  setBias(bias: Bias): void {
    this._bias = bias;
    
    // Create a new configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
    }
    
    // Update the configuration
    this._config.setBias(bias);
    
    // Apply the configuration if the line is already exported
    if (this._isExported) {
      this._applyConfig();
    } else {
      this._export();
    }
  }

  /**
   * Watches for value changes on the line
   * @param callback The callback to call when the value changes
   */
  watch(callback: (err: Error | null, value: Value) => void): void {
    if (!this._isExported) {
      this._export();
    }
    
    if (this._edge === Edge.NONE) {
      this.setEdge(Edge.BOTH);
    }
    
    if (!this._isWatching) {
      this._nativeLine.watch((err: Error | null, value: Value) => {
        if (err) {
          this.emit('error', err);
        } else {
          this._value = value;
          this.emit('change', value);
        }
      });
      
      this._isWatching = true;
    }
    
    // Add the callback as a listener
    this.on('change', (value: Value) => callback(null, value));
    this.on('error', (err: Error) => callback(err, Value.LOW));
  }

  /**
   * Stops watching for value changes
   */
  unwatch(): void {
    if (this._isWatching) {
      this._nativeLine.unwatch();
      this._isWatching = false;
      
      // Remove all listeners
      this.removeAllListeners('change');
      this.removeAllListeners('error');
    }
  }

  /**
   * Exports the line for use
   */
  private _export(): void {
    if (this._isExported) {
      return;
    }
    
    // Create a default configuration if needed
    if (!this._config) {
      this._config = new LineConfig();
      this._config.setDirection(this._direction);
      this._config.setEdge(this._edge);
      this._config.setDrive(this._drive);
      this._config.setBias(this._bias);
    }
    
    // Create a request
    this._request = new LineRequest(this._chip, [this._offset], this._config);
    
    // Export the line
    this._nativeLine.export(this._request.nativeRequest);
    this._isExported = true;
  }

  /**
   * Applies the current configuration to the line
   */
  private _applyConfig(): void {
    if (!this._isExported || !this._config) {
      return;
    }
    
    // Release the current request
    if (this._request) {
      this._request.release();
    }
    
    // Create a new request
    this._request = new LineRequest(this._chip, [this._offset], this._config);
    
    // Export the line with the new configuration
    this._nativeLine.export(this._request.nativeRequest);
  }

  /**
   * Unexports the line and releases all resources
   */
  unexport(): void {
    // Stop watching if needed
    if (this._isWatching) {
      this.unwatch();
    }
    
    // Release the request if needed
    if (this._request) {
      this._request.release();
      this._request = null;
    }
    
    // Unexport the line
    if (this._isExported) {
      this._nativeLine.unexport();
      this._isExported = false;
    }
  }

  /**
   * Gets the native line instance (for internal use)
   */
  get nativeLine(): any {
    return this._nativeLine;
  }
}
