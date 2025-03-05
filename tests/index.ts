import { run, suite } from "node:test";
import { executeChipTests } from "./testChips.js";
import { executeLineTests } from "./testLines.js";
import { checkGpioMockup } from "./utils.js";
import path from "path";
import { tap } from "node:test/reporters";

async function main(): Promise<void> {

    checkGpioMockup();
    run({ files: [path.resolve('./dist/tests/setupTests.js')] }).compose(tap).pipe(process.stdout);
    //await executeLineTests();
}

main();