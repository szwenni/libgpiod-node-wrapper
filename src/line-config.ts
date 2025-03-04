import bindings from 'bindings';
import { Direction, Edge, Drive, Bias, Value } from './enums.js';

// Load native addon
const addon = bindings('gpiod2-node-gyp');

/**
 * Configuration for a GPIO line
 */
export class LineConfig {
  private _nativeConfig: any;

  /**
   * Creates a new LineConfig instance
   */
  constructor() {
    this._nativeConfig = new addon.LineConfig();
  }

  /**
   * Sets the offset for which subsequent configuration will apply
   * @param offset The line offset to configure
   */
  setOffset(offset: number): void {
    this._nativeConfig.setOffset(offset);
  }

  /**
   * Sets the direction of the line
   * @param direction The direction to set
   */
  setDirection(direction: Direction): void {
    this._nativeConfig.setDirection(direction);
  }

  /**
   * Sets the edge detection mode
   * @param edge The edge detection mode
   */
  setEdge(edge: Edge): void {
    this._nativeConfig.setEdge(edge);
  }

  /**
   * Sets the drive mode
   * @param drive The drive mode
   */
  setDrive(drive: Drive): void {
    this._nativeConfig.setDrive(drive);
  }

  /**
   * Sets the bias mode
   * @param bias The bias mode
   */
  setBias(bias: Bias): void {
    this._nativeConfig.setBias(bias);
  }

  /**
   * Sets the active low flag
   * @param activeLow Whether the line is active low
   */
  setActiveLow(activeLow: boolean): void {
    this._nativeConfig.setActiveLow(activeLow);
  }

  /**
   * Sets the output value
   * @param value The output value
   */
  setOutputValue(value: Value): void {
    this._nativeConfig.setOutputValue(value === Value.HIGH);
  }

  /**
   * Sets the debounce period for the line
   * @param microseconds Debounce period in microseconds
   */
  setDebouncePeriod(microseconds: number): void {
    this._nativeConfig.setDebouncePeriod(microseconds);
  }

  /**
   * Gets the native config instance (for internal use)
   */
  get nativeConfig(): any {
    return this._nativeConfig;
  }
}
