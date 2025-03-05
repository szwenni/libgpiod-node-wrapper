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

  import fs from 'fs';

  export function getMockChip(): Chip | undefined {

    const chipsPaths: string[] = Chip.getChips();

    return chipsPaths.map(x => new Chip(x)).find(x => x.label === 'gpio-mockup-A');
  }

  export function readMockValue(offset: number): Value {
    return Number.parseInt(fs.readFileSync(`/sys/kernel/debug/gpio-mockup/gpiochip14/${offset}`, 'utf-8').trim(), 10) as Value;
  }

  export function writeMockValue(offset: number, value: Value): void {
    fs.writeFileSync(`/sys/kernel/debug/gpio-mockup/gpiochip14/${offset}`, `${value}\n`, 'utf-8');
  }

  export function cleanupMockChip(chip: Chip | undefined): void {
    if(chip === undefined) return; 
    for(let i = 0; i < chip.numLines; i++) {
      writeMockValue(i, Value.LOW);
    }
    chip.close();
  }

  export function waitTimeout(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  export function checkGpioMockup(): void {
    const chip: Chip | undefined = getMockChip();
    if(chip === undefined) {
      console.error('Error: No gpio-mockup-A found');
      console.log("Please execute 'modprobe gpio-mockup gpio_mockup_ranges=1,8'");
      process.exit(1);
    }
    chip.close();
  }