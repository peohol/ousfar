/** Automatisk vaktfordeling (delmål B). UI-uavhengig; bruker regelmotoren for alle harde krav. */
export { TERMS, TERM_LABELS, type Breakdown, type Term } from './cost.ts';
export { allocatedTypes, allocationPeriodError, MAX_PERIOD_DAYS, type AllocationMode, type AllocationRequest } from './model.ts';
export { MAX_PASSES, type Delta, type Score } from './search.ts';
export * from './proposal.ts';
export * from './workload.ts';
