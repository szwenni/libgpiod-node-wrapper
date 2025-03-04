/**
 * Basic usage examples for the libgpiod2-node library
 * 
 * This example demonstrates:
 * 1. Discovering available GPIO chips
 * 2. Getting chip and line information
 * 3. Configuring GPIO lines for input and output
 * 4. Reading and writing GPIO values
 * 5. Setting up edge detection and event handling
 */

import { 
  Chip, 
  Line, 
  Direction, 
  Edge, 
  Value, 
  Bias, 
  Drive, 
  LineConfig 
} from '../src/index.js';

/**
 * Discovers and lists all available GPIO chips in the system
 */
function discoverGpioChips(): string[] {
  try {
    // Get all available GPIO chips
    const chipPaths = Chip.getChips();
    
    console.log(`Found ${chipPaths.length} GPIO chip(s):`);
    chipPaths.forEach((path, index) => {
      console.log(`  ${index + 1}. ${path}`);
    });
    
    return chipPaths;
  } catch (error) {
    console.error('Error discovering GPIO chips:', error);
    return [];
  }
}

/**
 * Displays detailed information about a specific GPIO chip
 * @param chipPath Path to the GPIO chip (e.g., 'gpiochip0')
 */
function exploreGpioChip(chipPath: string): void {
  try {
    console.log(`\nExploring GPIO chip: ${chipPath}`);
    
    // Open the chip
    const chip = new Chip(chipPath);
    
    // Get and display chip information
    console.log('Chip Information:');
    console.log(`  Name: ${chip.name}`);
    console.log(`  Label: ${chip.label}`);
    console.log(`  Number of Lines: ${chip.numLines}`);
    
    // Close the chip when done
    chip.close();
  } catch (error) {
    console.error(`Error exploring chip ${chipPath}:`, error);
  }
}

/**
 * Displays information about all lines on a specific GPIO chip
 * @param chipPath Path to the GPIO chip
 */
function exploreGpioLines(chipPath: string): void {
  try {
    console.log(`\nExploring lines on GPIO chip: ${chipPath}`);
    
    // Open the chip
    const chip = new Chip(chipPath);
    
    // Explore each line
    for (let offset = 0; offset < chip.numLines; offset++) {
      try {
        // Get a line instance
        const line = chip.getLine(offset);
        
        console.log(`\nLine ${offset} Information:`);
        console.log(`  Offset: ${line.offset}`);
        
        // Get additional line information without exporting
        try {
          const lineInfo = chip.getLineInfo(offset);
          console.log(`  Name: ${lineInfo.name || 'unnamed'}`);
          console.log(`  Used: ${lineInfo.used ? 'Yes' : 'No'}`);
          console.log(`  Direction: ${lineInfo.direction}`);
          console.log(`  Active Low: ${lineInfo.activeLow ? 'Yes' : 'No'}`);
          console.log(`  Consumer: ${lineInfo.consumer || 'none'}`);
        } catch (infoError) {
          console.error(`  Error getting line info: ${infoError}`);
        }
        
        // Note: Additional line information might require exporting the line
        // which could fail if the line is already in use by another process
      } catch (lineError) {
        console.error(`  Error accessing line ${offset}:`, lineError);
      }
    }
    
    // Close the chip when done
    chip.close();
  } catch (error) {
    console.error(`Error exploring lines on chip ${chipPath}:`, error);
  }
}

/**
 * Demonstrates configuring and using a GPIO line as an input
 * @param chipPath Path to the GPIO chip
 * @param lineOffset Offset of the line to use
 */
function demonstrateInputLine(chipPath: string, lineOffset: number): void {
  try {
    console.log(`\nDemonstrating input line: ${chipPath} line ${lineOffset}`);
    
    // Open the chip
    const chip = new Chip(chipPath);
    
    // Get the line
    const line = chip.getLine(lineOffset);
    
    // Configure the line as an input with pull-up
    line.setDirection(Direction.INPUT);
    line.setBias(Bias.PULL_UP);
    
    // Read the current value
    const value = line.getValue();
    console.log(`  Current value: ${value === Value.HIGH ? 'HIGH' : 'LOW'}`);
    
    // Set up edge detection (both rising and falling edges)
    console.log('  Setting up edge detection (press Ctrl+C to exit)...');
    line.setEdge(Edge.BOTH);
    line.setDebouncePeriod(200);
    line.setActiveLow(false);
    
    // Watch for changes
    line.watch((err, value) => {
      if (err) {
        console.error('  Error watching line:', err);
        return;
      }
      
      console.log(`  Line value changed: ${value === Value.HIGH ? 'HIGH' : 'LOW'}`);
    });
    
    // Keep the program running
    console.log('  Watching for changes (press Ctrl+C to exit)...');
    
    // Set up cleanup on exit
    process.on('SIGINT', () => {
      console.log('\nCleaning up...');
      line.unwatch();
      line.unexport();
      chip.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error demonstrating input line:`, error);
  }
}

/**
 * Demonstrates configuring and using a GPIO line as an output
 * @param chipPath Path to the GPIO chip
 * @param lineOffset Offset of the line to use
 */
function demonstrateOutputLine(chipPath: string, lineOffset: number): void {
  try {
    console.log(`\nDemonstrating output line: ${chipPath} line ${lineOffset}`);
    
    // Open the chip
    const chip = new Chip(chipPath);
    
    // Get the line
    const line = chip.getLine(lineOffset);
    
    // Configure the line as an output
    line.setDirection(Direction.OUTPUT);
    line.setDrive(Drive.PUSH_PULL);
    
    // Toggle the line every second
    console.log('  Toggling output every second (press Ctrl+C to exit)...');
    let value = Value.LOW;
    
    const interval = setInterval(() => {
      try {
        // Toggle the value
        value = value === Value.LOW ? Value.HIGH : Value.LOW;
        line.setValue(value);
        console.log(`  Set line to: ${value === Value.HIGH ? 'HIGH' : 'LOW'}`);
      } catch (error) {
        console.error('  Error setting value:', error);
        clearInterval(interval);
      }
    }, 1000);
    
    // Set up cleanup on exit
    process.on('SIGINT', () => {
      console.log('\nCleaning up...');
      clearInterval(interval);
      line.unexport();
      chip.close();
      process.exit(0);
    });
  } catch (error) {
    console.error(`Error demonstrating output line:`, error);
  }
}

/**
 * Main function to run the examples
 */
function main(): void {
  console.log('libgpiod2-node Basic Usage Examples');
  console.log('==================================');
  
  // Discover available GPIO chips
  const chipPaths = discoverGpioChips();
  
  if (chipPaths.length === 0) {
    console.error('No GPIO chips found. Are you running on a system with GPIO support?');
    return;
  }
  
  // Use the first available chip for examples
  const chipPath = chipPaths[0];
  
  // Explore the chip and its lines
  exploreGpioChip(chipPath);
  exploreGpioLines(chipPath);
  
  // Determine which example to run based on command line arguments
  const args = process.argv.slice(2);
  const mode = args[0] || 'info';
  const lineOffset = parseInt(args[1] || '0', 10);
  
  switch (mode) {
    case 'input':
      demonstrateInputLine(chipPath, lineOffset);
      break;
    case 'output':
      demonstrateOutputLine(chipPath, lineOffset);
      break;
    case 'info':
    default:
      console.log('\nTo run input example: node basic-usage.js input <line_offset>');
      console.log('To run output example: node basic-usage.js output <line_offset>');
      process.exit(0);
  }
}

// Run the main function
main();
