# DISCLAIMER

This library is a work in progress.
It may have bugs, and it may not follow the best practices for a library.

Please report any issues you find, and help me improve the library by submitting pull requests or at least a issue. I'm not forcing anybody to use any template for a issue, just describe the bug and the output you are getting. Pull request is always better, you know it :)

I'm not responsible for any damage caused by using this library. Use with caution, but I was not able to break anything till now.


# libgpiod2-node-wrapper

A Node.js wrapper for the libgpiod 2 C++ API. This library provides an easy-to-use interface for GPIO manipulation on Linux systems, similar to the [onoff](https://www.npmjs.com/package/onoff) library but using the modern libgpiod 2 API.

## Requirements

- Node.js >= 16.0.0
- libgpiod 2+ development headers
- A C++ compiler compatible with C++17

## Installation

```bash
# Install libgpiod development headers (on Debian/Ubuntu)
sudo apt-get install libgpiod-dev

# Install the package (not wokrking currently as I did not publish anything)
npm install libgpiod2-node
```

## Usage

```typescript
import { Chip, Direction, Edge, Value, LineConfig, LineRequest } from 'libgpiod2-node';

// Discover available GPIO chips
const chipPaths = Chip.getChips();
console.log('Available chips:', chipPaths);

// Open GPIO chip
const chip = new Chip('gpiochip0');
console.log(`Chip label: ${chip.label}`);
console.log(`Number of lines: ${chip.numLines}`);

// Get information about a line without exporting it
const lineInfo = chip.getLineInfo(17);
console.log('Line info:', lineInfo);

// Configure GPIO line for output
const led = chip.getLine(17);
led.setDirection(Direction.OUTPUT);
led.setValue(Value.HIGH);

// Configure GPIO line for input with interrupt
const button = chip.getLine(27);
button.setDirection(Direction.INPUT);
button.setEdge(Edge.BOTH);

// Watch for button changes
button.watch((err, value) => {
  if (err) {
    console.error('Error:', err);
    return;
  }
  console.log('Button value changed to:', value);
  
  // Toggle LED when button is pressed
  if (value === Value.HIGH) {
    const currentValue = led.getValue();
    led.setValue(currentValue === Value.HIGH ? Value.LOW : Value.HIGH);
  }
});

// Example of configuring multiple lines with different settings
function configureMultipleLines() {
  // Create a line configuration
  const config = new LineConfig();
  
  // Configure line 5 as output
  config.setOffset(5);
  config.setDirection(Direction.OUTPUT);
  config.setDrive(Drive.PUSH_PULL);
  config.setOutputValue(Value.HIGH);
  
  // Configure line 6 as input with pull-up and edge detection
  config.setOffset(6);
  config.setDirection(Direction.INPUT);
  config.setBias(Bias.PULL_UP);
  config.setEdge(Edge.BOTH);
  
  // Request both lines at once
  const request = new LineRequest(chip, [5, 6], config);
  
  // Now you can interact with both lines through the request object
  console.log(`Line 6 value: ${request.getValue(6)}`);
  request.setValue(5, Value.LOW);
  
  // Remember to release when done
  request.release();
}

// Remember to clean up when done
process.on('SIGINT', () => {
  console.log('Cleaning up...');
  button.unwatch();
  button.unexport();
  led.unexport();
  chip.close();
  process.exit(0);
});
```

## API

### Chip

- `new Chip(name: string)` - Open a GPIO chip by name
- `getLine(offset: number)` - Get a GPIO line by offset
- `close()` - Close the chip
- `getChips()` - Get a list of available GPIO chip paths
- `label` - Get the label of the chip
- `numLines` - Get the number of lines on the chip
- `getLineInfo(offset: number)` - Get information about a line without exporting it

### Line

- `setDirection(direction: Direction)` - Set line direction (INPUT or OUTPUT)
- `setValue(value: Value)` - Set line value (HIGH or LOW)
- `getValue()` - Get current line value
- `setEdge(edge: Edge)` - Set edge detection (NONE, RISING, FALLING, or BOTH)
- `watch(callback: (err: Error | null, value: Value) => void)` - Watch for value changes
- `unwatch()` - Stop watching for changes
- `unexport()` - Release the line

### LineConfig

- `setOffset(offset: number)` - Set the offset for which subsequent configuration will apply
- `setDirection(direction: Direction)` - Set line direction
- `setEdge(edge: Edge)` - Set edge detection
- `setBias(bias: Bias)` - Set line bias
- `setDrive(drive: Drive)` - Set line drive
- `setActiveLow(activeLow: boolean)` - Set active low
- `setOutputValue(value: Value)` - Set initial output value

### LineRequest

- `new LineRequest(chip: Chip, offsets: number[], config: LineConfig)` - Create a new LineRequest instance
- `getValue(offset: number)` - Get value of a requested line
- `setValue(offset: number, value: Value)` - Set value of a requested line
- `release()` - Release all requested lines

### Enums

- `Direction`: INPUT, OUTPUT
- `Value`: LOW, HIGH
- `Edge`: NONE, RISING, FALLING, BOTH
- `Bias`: UNKNOWN, DISABLED, PULL_UP, PULL_DOWN
- `Drive`: PUSH_PULL, OPEN_DRAIN, OPEN_SOURCE

## License

LGPL-2.1
