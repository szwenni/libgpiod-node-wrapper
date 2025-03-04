/**
 * Advanced usage examples for the libgpiod2-node library
 * 
 * This example demonstrates:
 * 1. Working with multiple GPIO lines simultaneously
 * 2. Using LineRequest for bulk operations
 * 3. Implementing a simple button and LED circuit
 * 4. Handling edge detection with debouncing
 * 5. Proper resource cleanup
 */

import { 
  Chip, 
  Line, 
  Direction, 
  Edge, 
  Value, 
  Bias, 
  Drive, 
  LineConfig,
  LineRequest 
} from '../src/index.js';

/**
 * Class representing a simple button connected to a GPIO pin
 */
class GpioButton {
  private chip: Chip;
  private line: Line;
  private debounceTimeout: NodeJS.Timeout | null = null;
  private lastState: Value = Value.LOW;
  private callbacks: Map<string, (value: Value) => void> = new Map();
  private debounceMs: number;
  
  /**
   * Creates a new GpioButton instance
   * @param chipPath Path to the GPIO chip
   * @param lineOffset Offset of the button line
   * @param options Configuration options
   */
  constructor(chipPath: string, lineOffset: number, options: {
    pullUp?: boolean,
    activeHigh?: boolean,
    debounceMs?: number
  } = {}) {
    this.debounceMs = options.debounceMs || 50;
    
    // Open the chip
    this.chip = new Chip(chipPath);
    
    // Get the line
    this.line = this.chip.getLine(lineOffset);
    
    // Configure the line as an input with appropriate bias
    this.line.setDirection(Direction.INPUT);
    this.line.setBias(options.pullUp ? Bias.PULL_UP : Bias.PULL_DOWN);
    
    // Set up edge detection
    this.line.setEdge(Edge.BOTH);
    
    // Set up the watcher
    this.line.watch((err, value) => {
      if (err) {
        console.error('Error watching button:', err);
        return;
      }
      
      // Debounce the input
      if (this.debounceTimeout) {
        clearTimeout(this.debounceTimeout);
      }
      
      this.debounceTimeout = setTimeout(() => {
        // Only trigger if the state has changed
        if (value !== this.lastState) {
          this.lastState = value;
          
          // Notify all callbacks
          this.callbacks.forEach(callback => callback(value));
        }
      }, this.debounceMs);
    });
  }
  
  /**
   * Registers a callback for button state changes
   * @param id Unique identifier for the callback
   * @param callback Function to call when button state changes
   */
  onChange(id: string, callback: (value: Value) => void): void {
    this.callbacks.set(id, callback);
  }
  
  /**
   * Removes a callback
   * @param id Identifier of the callback to remove
   */
  removeCallback(id: string): void {
    this.callbacks.delete(id);
  }
  
  /**
   * Gets the current button state
   * @returns Current button state (HIGH or LOW)
   */
  getState(): Value {
    return this.line.getValue();
  }
  
  /**
   * Releases all resources
   */
  close(): void {
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    
    this.callbacks.clear();
    this.line.unwatch();
    this.line.unexport();
    this.chip.close();
  }
}

/**
 * Class representing an LED connected to a GPIO pin
 */
class GpioLed {
  private chip: Chip;
  private line: Line;
  private activeHigh: boolean;
  
  /**
   * Creates a new GpioLed instance
   * @param chipPath Path to the GPIO chip
   * @param lineOffset Offset of the LED line
   * @param options Configuration options
   */
  constructor(chipPath: string, lineOffset: number, options: {
    activeHigh?: boolean
  } = {}) {
    this.activeHigh = options.activeHigh !== false;
    
    // Open the chip
    this.chip = new Chip(chipPath);
    
    // Get the line
    this.line = this.chip.getLine(lineOffset);
    
    // Configure the line as an output
    this.line.setDirection(Direction.OUTPUT);
    this.line.setDrive(Drive.PUSH_PULL);
    
    // Initialize to OFF
    this.off();
  }
  
  /**
   * Turns the LED on
   */
  on(): void {
    this.line.setValue(this.activeHigh ? Value.HIGH : Value.LOW);
  }
  
  /**
   * Turns the LED off
   */
  off(): void {
    this.line.setValue(this.activeHigh ? Value.LOW : Value.HIGH);
  }
  
  /**
   * Toggles the LED state
   */
  toggle(): void {
    const currentValue = this.line.getValue();
    this.line.setValue(currentValue === Value.HIGH ? Value.LOW : Value.HIGH);
  }
  
  /**
   * Releases all resources
   */
  close(): void {
    this.line.unexport();
    this.chip.close();
  }
}

/**
 * Demonstrates using multiple lines with a LineRequest
 * @param chipPath Path to the GPIO chip
 * @param lineOffsets Array of line offsets to use
 */
function demonstrateMultipleLines(chipPath: string, lineOffsets: number[]): void {
  console.log(`\nDemonstrating multiple lines with offsets: ${lineOffsets.join(', ')}`);
  
  try {
    // Open the chip
    const chip = new Chip(chipPath);
    console.log(`Using chip: ${chip.name} (${chip.label})`);
    
    // Create a line configuration
    const config = new LineConfig();
    
    // Configure each line with different settings
    lineOffsets.forEach((offset, index) => {
      // Set the offset we want to configure
      config.setOffset(offset);
      
      if (index % 2 === 0) {
        // Configure even offsets as outputs
        config.setDirection(Direction.OUTPUT);
        config.setDrive(Drive.PUSH_PULL);
        config.setOutputValue(index % 4 === 0 ? Value.HIGH : Value.LOW); // Alternate initial values
      } else {
        // Configure odd offsets as inputs with pull-up
        config.setDirection(Direction.INPUT);
        config.setBias(Bias.PULL_UP);
        config.setEdge(Edge.BOTH);
      }
    });
    
    // Request all lines at once
    const request = new LineRequest(chip, lineOffsets, config);
    console.log('Lines requested successfully');
    
    // Read values from input lines
    const inputOffsets = lineOffsets.filter((_, i) => i % 2 !== 0);
    if (inputOffsets.length > 0) {
      console.log('Input line values:');
      inputOffsets.forEach(offset => {
        const value = request.getValue(offset);
        console.log(`  Line ${offset}: ${value === Value.HIGH ? 'HIGH' : 'LOW'}`);
      });
    }
    
    // Toggle output lines a few times
    const outputOffsets = lineOffsets.filter((_, i) => i % 2 === 0);
    if (outputOffsets.length > 0) {
      console.log('Toggling output lines:');
      
      for (let i = 0; i < 3; i++) {
        outputOffsets.forEach(offset => {
          const currentValue = request.getValue(offset);
          const newValue = currentValue === Value.HIGH ? Value.LOW : Value.HIGH;
          request.setValue(offset, newValue);
          console.log(`  Line ${offset}: ${newValue === Value.HIGH ? 'HIGH' : 'LOW'}`);
        });
        
        // Small delay between toggles
        console.log('  Waiting 500ms...');
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      }
    }
    
    // Release the lines
    request.release();
    console.log('Lines released');
    
    // Close the chip
    chip.close();
    console.log('Chip closed');
  } catch (err) {
    console.error('Error:', err);
  }
}

/**
 * Demonstrates a button controlling an LED
 * @param chipPath Path to the GPIO chip
 * @param buttonOffset Offset of the button line
 * @param ledOffset Offset of the LED line
 */
function demonstrateButtonLed(chipPath: string, buttonOffset: number, ledOffset: number): void {
  try {
    console.log(`\nDemonstrating button-controlled LED:`);
    console.log(`  Chip: ${chipPath}`);
    console.log(`  Button: line ${buttonOffset}`);
    console.log(`  LED: line ${ledOffset}`);
    
    // Create button and LED instances
    const button = new GpioButton(chipPath, buttonOffset, {
      pullUp: true,
      debounceMs: 50
    });
    
    const led = new GpioLed(chipPath, ledOffset, {
      activeHigh: true
    });
    
    console.log('  Press the button to toggle the LED (press Ctrl+C to exit)...');
    
    // Set up button callback to toggle LED
    button.onChange('led-control', (value) => {
      if (value === Value.LOW) {  // Button pressed (pulled to ground)
        console.log('  Button pressed, toggling LED');
        led.toggle();
      }
    });
    
    // Set up cleanup on exit
    process.on('SIGINT', () => {
      console.log('\nCleaning up...');
      button.close();
      led.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error demonstrating button-LED control:`, error);
  }
}

/**
 * Main function to run the examples
 */
function main(): void {
  console.log('libgpiod2-node Advanced Usage Examples');
  console.log('=====================================');
  
  // Get available GPIO chips
  try {
    const chipPaths = Chip.getChips();
    
    if (chipPaths.length === 0) {
      console.error('No GPIO chips found. Are you running on a system with GPIO support?');
      return;
    }
    
    // Print available chips
    console.log('Available GPIO chips:');
    for (const chipPath of chipPaths) {
      try {
        const chip = new Chip(chipPath);
        console.log(`  ${chipPath} (${chip.label}) - ${chip.numLines} lines`);
        chip.close();
      } catch (error) {
        console.log(`  ${chipPath} - Error: ${error}`);
      }
    }
    
    // Use the first available chip for examples
    const chipPath = chipPaths[0];
    
    // Determine which example to run based on command line arguments
    const args = process.argv.slice(2);
    const mode = args[0] || 'help';
    
    switch (mode) {
      case 'multi':
        // Use lines 0-3 by default, or parse from arguments
        const lineOffsets = args.length > 1 
          ? args.slice(1).map(arg => parseInt(arg, 10))
          : [0, 1, 2, 3];
        demonstrateMultipleLines(chipPath, lineOffsets);
        break;
        
      case 'button-led':
        const buttonOffset = parseInt(args[1] || '0', 10);
        const ledOffset = parseInt(args[2] || '1', 10);
        demonstrateButtonLed(chipPath, buttonOffset, ledOffset);
        break;
        
      case 'help':
      default:
        console.log('\nAvailable examples:');
        console.log('  node advanced-usage.js multi [line1 line2 ...]');
        console.log('    - Demonstrates using multiple lines as outputs in a binary counter pattern');
        console.log('    - Default: uses lines 0, 1, 2, 3');
        console.log('\n  node advanced-usage.js button-led [button_line led_line]');
        console.log('    - Demonstrates using a button to control an LED');
        console.log('    - Default: button on line 0, LED on line 1');
        process.exit(0);
    }
  } catch (error) {
    console.error('Error initializing examples:', error);
  }
}

// Run the main function
main();
