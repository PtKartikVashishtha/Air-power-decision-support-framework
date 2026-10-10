import { runFullAuditedAlns } from './exp1-alns-rigour';
const r1 = runFullAuditedAlns(42);
const r2 = runFullAuditedAlns(42);
console.log('Run 1 best:', r1.bestObjective);
console.log('Run 2 best:', r2.bestObjective);
console.log('Exact Match:', r1.bestObjective === r2.bestObjective);
