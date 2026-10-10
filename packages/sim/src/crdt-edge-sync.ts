/**
 * Conflict-Free Replicated Data Type (CRDT) Edge Synchronization Engine
 * Degraded-Comms & Link-Severance Echelon Resilience (Air HQ <-> Forward Operating Bases)
 * 
 * Provides:
 * 1. Multi-Node Echelon Architecture:
 *    - CAOC_AIR_HQ (Central Command)
 *    - BASE_AMBALA (Forward Node 1)
 *    - BASE_JODHPUR (Forward Node 2)
 * 2. Comms Link State Simulation:
 *    - Interactive "Cut the Link" partition toggle: simulates radio/satellite EW jamming,
 *      severing HQ-to-Base synchronization.
 * 3. Local Delegated Edge Autonomy:
 *    - When partitioned, edge bases continue autonomous local planning, scramble alerts,
 *      and turnaround scheduling within their jurisdictional authority.
 * 4. Vector Clock & Operation-Based CRDT Event-Log Sync:
 *    - On link restoration ("Restore Link"), merges partitioned event streams deterministically
 *      using Lamport vector clocks and military conflict-resolution precedence:
 *      (Local physical execution > Headquarters hypothetical tasking).
 */

import { Sortie, Aircraft } from '@air-power/shared';

export interface VectorClock {
  hq: number;
  ambala: number;
  jodhpur: number;
}

export type CrdtOpType =
  | 'LOCAL_SCRAMBLE_SORTIE'
  | 'AIRCRAFT_AOG_DECLARED'
  | 'SORTIE_STATUS_UPDATED'
  | 'PLAN_COMMITTED';

export interface CrdtEvent {
  eventId: string;
  originNodeId: 'CAOC_AIR_HQ' | 'BASE_AMBALA' | 'BASE_JODHPUR';
  opType: CrdtOpType;
  timestampIso: string;
  vectorClock: VectorClock;
  payload: any;
}

export interface CrdtSyncReconciliation {
  syncSessionId: string;
  syncedAtIso: string;
  mergedEventsCount: number;
  conflictsResolvedCount: number;
  resolvedConflictDetails: Array<{
    conflictType: string;
    description: string;
    winnerEventId: string;
    rationale: string;
  }>;
  finalUnifiedSortiesCount: number;
}

export class EdgeCrdtSyncNode {
  public nodeId: 'CAOC_AIR_HQ' | 'BASE_AMBALA' | 'BASE_JODHPUR';
  public isLinkSevered = false;
  private vectorClock: VectorClock = { hq: 0, ambala: 0, jodhpur: 0 };
  private eventLog: CrdtEvent[] = [];
  private committedSorties: Map<string, Sortie> = new Map();
  private sortieCommittedByEvent: Map<string, CrdtEvent> = new Map();

  constructor(nodeId: 'CAOC_AIR_HQ' | 'BASE_AMBALA' | 'BASE_JODHPUR') {
    this.nodeId = nodeId;
  }

  public setLinkSevered(severed: boolean): void {
    this.isLinkSevered = severed;
  }

  public getVectorClock(): VectorClock {
    return { ...this.vectorClock };
  }

  public getEventLog(): CrdtEvent[] {
    return [...this.eventLog];
  }

  public getCommittedSorties(): Sortie[] {
    return Array.from(this.committedSorties.values());
  }

  /**
   * Records a local operation on this node, advancing its vector clock
   */
  public recordLocalOperation(opType: CrdtOpType, payload: any): CrdtEvent {
    // Advance own vector clock component
    if (this.nodeId === 'CAOC_AIR_HQ') this.vectorClock.hq++;
    else if (this.nodeId === 'BASE_AMBALA') this.vectorClock.ambala++;
    else if (this.nodeId === 'BASE_JODHPUR') this.vectorClock.jodhpur++;

    const event: CrdtEvent = {
      eventId: `EVT-${this.nodeId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      originNodeId: this.nodeId,
      opType,
      timestampIso: new Date().toISOString(),
      vectorClock: { ...this.vectorClock },
      payload,
    };

    this.eventLog.push(event);

    // Apply to local state
    if (opType === 'LOCAL_SCRAMBLE_SORTIE' && payload.sortie) {
      this.committedSorties.set(payload.sortie.sortieId, payload.sortie);
      this.sortieCommittedByEvent.set(payload.sortie.sortieId, event);
    }

    return event;
  }

  /**
   * Merges remote events from a peer node upon reconnection using deterministic CRDT rules
   */
  public mergeRemoteEventLogs(remoteNode: EdgeCrdtSyncNode): CrdtSyncReconciliation {
    const remoteEvents = remoteNode.getEventLog();
    const existingIds = new Set(this.eventLog.map((e) => e.eventId));
    const newEvents = remoteEvents.filter((e) => !existingIds.has(e.eventId));

    const conflicts: Array<{
      conflictType: string;
      description: string;
      winnerEventId: string;
      rationale: string;
    }> = [];

    // 1. Process new events in vector clock order
    for (const evt of newEvents) {
      // Vector clock component-wise max
      this.vectorClock.hq = Math.max(this.vectorClock.hq, evt.vectorClock.hq);
      this.vectorClock.ambala = Math.max(this.vectorClock.ambala, evt.vectorClock.ambala);
      this.vectorClock.jodhpur = Math.max(this.vectorClock.jodhpur, evt.vectorClock.jodhpur);

      this.eventLog.push(evt);

      // Check conflict: double allocation of aircraft
      if (evt.opType === 'LOCAL_SCRAMBLE_SORTIE' && evt.payload.sortie) {
        const remoteSortie: Sortie = evt.payload.sortie;
        const conflictingLocal = Array.from(this.committedSorties.values()).find(
          (s) =>
            s.aircraftTail === remoteSortie.aircraftTail &&
            s.sortieId !== remoteSortie.sortieId
        );

        if (conflictingLocal) {
          const localEvt = this.sortieCommittedByEvent.get(conflictingLocal.sortieId);
          const remoteIsEdge = evt.originNodeId !== 'CAOC_AIR_HQ';
          const localIsEdge = localEvt ? localEvt.originNodeId !== 'CAOC_AIR_HQ' : false;

          let remoteWins = false;
          let rationale = '';

          if (remoteIsEdge && !localIsEdge) {
            // Edge physical execution beats HQ hypothetical plan
            remoteWins = true;
            rationale = `Forward Edge Base ${evt.originNodeId} physical sortie execution supersedes HQ hypothetical allocation.`;
          } else if (!remoteIsEdge && localIsEdge) {
            remoteWins = false;
            rationale = `Local forward edge base execution supersedes remote HQ hypothetical allocation.`;
          } else {
            // Symmetric tie-breaking across edge nodes or HQ nodes:
            const rTime = new Date(evt.timestampIso).getTime();
            const lTime = localEvt ? new Date(localEvt.timestampIso).getTime() : 0;
            if (rTime !== lTime) {
              remoteWins = rTime > lTime;
              rationale = `More recent timestamp (${rTime} vs ${lTime}) wins.`;
            } else {
              // Deterministic lexicographical tie-break on event ID
              remoteWins = evt.eventId.localeCompare(localEvt?.eventId || '') > 0;
              rationale = `Deterministic lexicographical tie-breaker on EventId.`;
            }
          }

          if (remoteWins) {
            this.committedSorties.delete(conflictingLocal.sortieId);
            this.sortieCommittedByEvent.delete(conflictingLocal.sortieId);
            this.committedSorties.set(remoteSortie.sortieId, remoteSortie);
            this.sortieCommittedByEvent.set(remoteSortie.sortieId, evt);
            conflicts.push({
              conflictType: 'AIRFRAME_CONCURRENT_ALLOCATION',
              description: `Airframe ${remoteSortie.aircraftTail} assigned to both ${conflictingLocal.sortieId} and ${remoteSortie.sortieId}.`,
              winnerEventId: evt.eventId,
              rationale,
            });
          } else {
            conflicts.push({
              conflictType: 'AIRFRAME_CONCURRENT_ALLOCATION',
              description: `Airframe ${remoteSortie.aircraftTail} assigned to both ${conflictingLocal.sortieId} and ${remoteSortie.sortieId}.`,
              winnerEventId: localEvt?.eventId || 'LOCAL',
              rationale,
            });
          }
        } else {
          this.committedSorties.set(remoteSortie.sortieId, remoteSortie);
          this.sortieCommittedByEvent.set(remoteSortie.sortieId, evt);
        }
      }
    }

    return {
      syncSessionId: `SYNC-${Date.now()}`,
      syncedAtIso: new Date().toISOString(),
      mergedEventsCount: newEvents.length,
      conflictsResolvedCount: conflicts.length,
      resolvedConflictDetails: conflicts,
      finalUnifiedSortiesCount: this.committedSorties.size,
    };
  }
}
