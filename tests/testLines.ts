import assert  from "assert";
import { Chip } from "../src/chip.js";
import { cleanupMockChip, getMockChip, readMockValue, waitTimeout, writeMockValue } from "./utils.js";
import { Line } from "../src/line.js";
import { Direction, Edge, Value } from "../src/enums.js";
import test, { TestContext } from "node:test";

export function testLines(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    assert(chip?.numLines === 7);
    for(let i = 0; i < (chip?.numLines || 0); i++) {       
        const line: Line | undefined = chip?.getLine(i);
        assert(line);
    }
    cleanupMockChip(chip);
}

export function testLineGetValue(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line: Line | undefined = chip?.getLine(0);
    assert(line);
    line?.setDirection(Direction.INPUT);
    const valueLow: Value | undefined = line?.getValue();
    assert(valueLow === Value.LOW);
    writeMockValue(0, Value.HIGH);
    const valueHigh: Value | undefined = line?.getValue();
    assert(valueHigh === Value.HIGH);
    writeMockValue(0, Value.LOW);
    const valueLow2: Value | undefined = line?.getValue();
    assert(valueLow2 === Value.LOW);
    cleanupMockChip(chip);
}

export function testLineSetValue(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line: Line | undefined = chip?.getLine(0);
    assert(line);
    line?.setDirection(Direction.OUTPUT);
    line?.setValue(Value.LOW);
    const valueLow: Value = readMockValue(0);
    assert(valueLow === Value.LOW);
    line?.setValue(Value.HIGH);
    const valueHigh: Value = readMockValue(0);
    assert(valueHigh === Value.HIGH);
    cleanupMockChip(chip);
}

export async function testWatchLineActiveLowValue(t: TestContext): Promise<void> {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line: Line | undefined = chip?.getLine(0);
    assert(line);
    line?.setDirection(Direction.INPUT);
    line?.setActiveLow(true);
    line?.setEdge(Edge.BOTH);
    let shouldBeHigh: boolean = false;
    let highTriggered: boolean = false;
    let lowTriggered: boolean = false;
    line?.watch((err, value) => {
        if (err) {
            console.error('Error watching line:', err);
            return;
        }
        if(shouldBeHigh) {
            assert(value === Value.HIGH);
            if(value === Value.HIGH) {
                highTriggered = true;
            }
        }
        else {
            assert(value === Value.LOW);
            if(value === Value.LOW) {
                lowTriggered = true;
            }
        }
    });
    writeMockValue(0, Value.HIGH);
    await waitTimeout(1000);
    assert(lowTriggered);
    shouldBeHigh = true;
    writeMockValue(0, Value.LOW);
    await waitTimeout(1000);
    assert(highTriggered);
    cleanupMockChip(chip);
}

export async function testWatchLineActiveHighValue(t: TestContext): Promise<void> {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line: Line | undefined = chip?.getLine(0);
    assert(line);
    line?.setDirection(Direction.INPUT);
    line?.setActiveLow(false);
    line?.setEdge(Edge.BOTH);
    let shouldBeHigh: boolean = true;
    let highTriggered: boolean = false;
    let lowTriggered: boolean = false;
    line?.watch((err, value) => {
        if (err) {
            console.error('Error watching line:', err);
            return;
        }
        if(shouldBeHigh) {
            assert(value === Value.HIGH);
            if(value === Value.HIGH) {
                highTriggered = true;
            }
        }
        else {
            assert(value === Value.LOW);
            if(value === Value.LOW) {
                lowTriggered = true;
            }
        }
    });
    writeMockValue(0, Value.HIGH);
    await waitTimeout(1000);
    assert(highTriggered);
    shouldBeHigh = false;
    writeMockValue(0, Value.LOW);
    await waitTimeout(1000);
    assert(lowTriggered);
    cleanupMockChip(chip);
}

export async function testLineDebounce(t: TestContext): Promise<void> {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line: Line | undefined = chip?.getLine(0);
    assert(line);
    line?.setDirection(Direction.INPUT);
    line?.setEdge(Edge.BOTH);
    line?.setDebouncePeriod(1000000);
    let triggerCount: number = 0;
    line?.watch((err, value) => {
        if (err) {
            console.error('Error watching line:', err);
            return;
        }
        triggerCount++;
    });
    writeMockValue(0, Value.HIGH);
    await waitTimeout(1100);
    writeMockValue(0, Value.LOW);
    await waitTimeout(300);
    writeMockValue(0, Value.HIGH);
    await waitTimeout(1100);
    writeMockValue(0, Value.LOW);
    await waitTimeout(2000);
    assert(triggerCount === 2);
    cleanupMockChip(chip);
}

export function testTwoLinesGetValue(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line1: Line | undefined = chip?.getLine(0);
    const line2: Line | undefined = chip?.getLine(1);
    assert(line1);
    assert(line2);
    line1?.setDirection(Direction.INPUT);
    line2?.setDirection(Direction.INPUT);
    let value1: Value | undefined = line1?.getValue();
    let value2: Value | undefined = line2?.getValue();
    assert(value1 === Value.LOW);
    assert(value2 === Value.LOW);
    writeMockValue(0, Value.HIGH);
    writeMockValue(1, Value.HIGH);  
    value1 = line1?.getValue();
    value2 = line2?.getValue();
    assert(value1 === Value.HIGH);
    assert(value2 === Value.HIGH);
    writeMockValue(0, Value.LOW);
    value1 = line1?.getValue();
    value2 = line2?.getValue();
    assert(value1 === Value.LOW);
    assert(value2 === Value.HIGH);
    cleanupMockChip(chip);
}

export function testTwoLinesSetValue(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line1: Line | undefined = chip?.getLine(0);
    const line2: Line | undefined = chip?.getLine(1);
    assert(line1);
    assert(line2);
    line1?.setDirection(Direction.OUTPUT);
    line2?.setDirection(Direction.OUTPUT);
    line1?.setValue(Value.HIGH);
    line2?.setValue(Value.HIGH);
    let value1: Value | undefined = readMockValue(0);
    let value2: Value | undefined = readMockValue(1);
    assert(value1 === Value.HIGH);
    assert(value2 === Value.HIGH);
    line1?.setValue(Value.LOW);
    line2?.setValue(Value.LOW);
    value1 = readMockValue(0);
    value2 = readMockValue(1);
    assert(value1 === Value.LOW);
    assert(value2 === Value.LOW);
    line1?.setValue(Value.HIGH);
    value1 = readMockValue(0);
    value2 = readMockValue(1);
    assert(value1 === Value.HIGH);
    assert(value2 === Value.LOW);
    cleanupMockChip(chip);
}

export async function testWatchTwoLines(t: TestContext): Promise<void> {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip?.numLines);
    const line1: Line | undefined = chip?.getLine(0);
    const line2: Line | undefined = chip?.getLine(1);
    assert(line1);
    assert(line2);
    line1?.setDirection(Direction.INPUT);
    line2?.setDirection(Direction.INPUT);
    line1?.setActiveLow(false);
    line2?.setActiveLow(true);
    line1?.setEdge(Edge.BOTH);
    line2?.setEdge(Edge.BOTH);
    line1?.setDebouncePeriod(500000);
    line2?.setDebouncePeriod(500000);
    let triggerCount = 0;
    let hightriggerCount = 0;
    let lowTriggerCount = 0;
    line1?.watch((err, value) => {
        if (err) {
            console.error('Error watching line:', err);
            return;
        }
        triggerCount++;
        if (value === Value.HIGH) {
            hightriggerCount++;
        } else {
            lowTriggerCount++;
        }
    });
    line2?.watch((err, value) => {
        if (err) {
            console.error('Error watching line:', err);
            return;
        }
        triggerCount++;
        if (value === Value.HIGH) {
            hightriggerCount++;
        } else {
            lowTriggerCount++;
        }
    });
    writeMockValue(0, Value.HIGH);
    writeMockValue(1, Value.HIGH);
    
    await waitTimeout(1100);
    assert.strictEqual(triggerCount, 2, "Expected trigger count to be 2");
    assert.strictEqual(hightriggerCount, 1, "Expected high trigger count to be 1");
    assert.strictEqual(lowTriggerCount, 1, "Expected low trigger count to be 1");
    writeMockValue(0, Value.LOW);
    writeMockValue(1, Value.LOW);
    await waitTimeout(1100);
    assert.strictEqual(triggerCount, 4, "Expected trigger count to be 4");
    assert.strictEqual(hightriggerCount, 2, "Expected high trigger count to be 2");
    assert.strictEqual(lowTriggerCount, 2, "Expected low trigger count to be 2");
    cleanupMockChip(chip);
}

export async function executeLineTests(): Promise<void> {
    await test('Line Tests', async (tt: TestContext) => {
        await tt.test('testLines', (t: TestContext) => testLines(t));
        await tt.test('testLineGetValue', (t: TestContext) => testLineGetValue(t));
        await tt.test('testLineSetValue', (t: TestContext) => testLineSetValue(t));
        await tt.test('testWatchLineActiveLowValue', async (t: TestContext) => await testWatchLineActiveLowValue(t));
        await tt.test('testWatchLineActiveHighValue', async (t: TestContext) => await testWatchLineActiveHighValue(t));
        await tt.test('testLineDebounce', (t: TestContext) => testLineDebounce(t));
        await tt.test('testTwoLinesSetValue', (t: TestContext) => testTwoLinesSetValue(t));
        await tt.test('testTwoLinesGetValue', (t: TestContext) => testTwoLinesGetValue(t));
        await tt.test('testWatchTwoLines', async (t: TestContext) => await testWatchTwoLines(t));
    });
}