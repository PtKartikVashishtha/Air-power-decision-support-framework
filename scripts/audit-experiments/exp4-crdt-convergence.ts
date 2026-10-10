import { EdgeCrdtSyncNode } from '../../packages/sim/src/crdt-edge-sync';
import { Sortie } from '../../packages/shared/src';

const nodeHQ = new EdgeCrdtSyncNode('CAOC_AIR_HQ');
const nodeAmbala = new EdgeCrdtSyncNode('BASE_AMBALA');
const nodeJodhpur = new EdgeCrdtSyncNode('BASE_JODHPUR');

// Create mock sorties
const s1: Sortie = {
  sortieId: 'SRT-0001',
  callsign: 'VAYU-1',
  packageId: 'PKG-1',
  targetRequestId: 'TGT-1',
  role: 'OMNIROLE_STRIKE',
  aircraftTail: 'RB-137',
  pilotId: 'PILOT-001',
  originBaseId: 'BASE_AMBALA',
  recoveryBaseId: 'BASE_AMBALA',
  munitionLoadout: [],
  depTimeMinutes: 60,
  totMinutes: 90,
  recoveryTimeMinutes: 120,
  fuelPlannedKg: 1000,
  routeWaypoints: [],
  expectedRiskScore: 10,
  status: 'SCHEDULED',
  isFrozen: false,
};

const s2: Sortie = {
  ...s1,
  sortieId: 'SRT-0002',
  callsign: 'VAYU-2',
  originBaseId: 'BASE_JODHPUR',
};

// Cut link
nodeHQ.setLinkSevered(true);
nodeAmbala.setLinkSevered(true);
nodeJodhpur.setLinkSevered(true);

// Node Ambala scrambles RB-137 locally
nodeAmbala.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: s1 });

// Node Jodhpur ALSO scrambles RB-137 locally
nodeJodhpur.recordLocalOperation('LOCAL_SCRAMBLE_SORTIE', { sortie: s2 });

// Reconnect and cross-merge
nodeAmbala.mergeRemoteEventLogs(nodeJodhpur);
nodeJodhpur.mergeRemoteEventLogs(nodeAmbala);

const ambalaSorties = nodeAmbala.getCommittedSorties();
const jodhpurSorties = nodeJodhpur.getCommittedSorties();

console.log('Ambala final sorties:', ambalaSorties.map(s => s.sortieId));
console.log('Jodhpur final sorties:', jodhpurSorties.map(s => s.sortieId));
console.log('Converged to same sortie?', ambalaSorties[0]?.sortieId === jodhpurSorties[0]?.sortieId);
