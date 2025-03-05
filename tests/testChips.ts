import { getMockChip } from "./utils.js";
import { Chip } from "../src/chip.js";
import test, { TestContext } from "node:test";
import assert from "assert";


export function getTestChip(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    console.log("getTestChip: success, Chip found:", chip.name);
    chip.close();
}

export function getTestChipDetails(t: TestContext): void {
    const chip: Chip | undefined = getMockChip();
    assert(chip);
    assert(chip.label === 'gpio-mockup-A');
    assert(chip.numLines === 7);
    console.log("getTestChipDetails: success, Chip found:", chip.name);
    chip.close();
}

function testGetUnsupportedChip(t: TestContext): void {
    try {
        new Chip('/dev/null');
        assert(false);
    } catch (error) {
        assert(true);
    }
}

async function testIsAccessible(t: TestContext): Promise<void> {
    try {
        const paths: string[] = await Chip.getChips();
        assert(paths.length > 0);
        assert(await Chip.isAccessible(paths[0]));
        assert(false);
    } catch (error) {
        assert(true);
    }
}

export function executeChipTests(): void {
    test('Chip Tests', async (tt: TestContext) => {
        await tt.test('testIsAccessible', async (t: TestContext) => await testIsAccessible(t));
        await tt.test('getTestChip', (t: TestContext) => getTestChip(t));
        await tt.test('getTestChipDetails', (t: TestContext) => getTestChipDetails(t));
        await tt.test('getUnsupportedChip', (t: TestContext) => testGetUnsupportedChip(t));
    });
}