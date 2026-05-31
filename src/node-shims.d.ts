declare module "node:fs" { const x: any; export default x; export = x; }
declare module "node:path" { const x: any; export default x; export = x; }
declare module "node:crypto" { const x: any; export default x; export = x; }
declare module "node:child_process" { export function execFileSync(...args: any[]): any; }
declare module "node:os" { const x: any; export default x; export = x; }
declare module "node:test" { export function test(name: string, fn: any): any; }
declare module "node:assert/strict" { const x: any; export default x; export = x; }
declare const process: any;
declare const Buffer: any;
