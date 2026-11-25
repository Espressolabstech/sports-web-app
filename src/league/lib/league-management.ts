/** Group / matchup helpers for the setup screens: validation as in the reference, stage status from the server. */
import { z } from 'zod';
import { getLeagueView } from '@league/lib/league-store';
import type { Match, Tie } from '@league/lib/tournament';

export const groupAssignmentSchema = z
    .record(z.string(), z.number().int().min(1).max(8))
    .refine((v) => Object.keys(v).length === 8 && new Set(Object.values(v)).size === 8, 'Assign each of the eight teams a different slot');

const NAMES: Record<string, string> = { group1: 'Group 1', group2: 'Group 2', combined: 'the combined table' };

/** Stage status for organisers (handoff §7): Waiting for … · Filled automatically · Needs a draw · Overridden. */
export function stageStatus(stage: 'cross' | 'semi' | 'final', _ties: Tie[], _matches: Match[]) {
    const v = getLeagueView();
    const st = v?.stages;
    if (!st) return '';
    if (stage === 'final') {
        const f = st.final;
        if (f.source === 'override') return 'Overridden';
        if (f.repair) return 'Re-pair needed: a semi-final result changed';
        if (f.source === 'filled') return 'Filled automatically';
        const n = (f.sides.a != null ? 1 : 0) + (f.sides.b != null ? 1 : 0);
        return n === 1 ? 'One semi-final winner filled' : 'Waiting for the semi-finals';
    }
    const s = stage === 'cross' ? st.cross : st.semis;
    if (s.source === 'override') return 'Overridden';
    if (s.repair) return 'Re-pair needed: a score correction changed the table';
    if (s.source === 'filled') return 'Filled automatically';
    if (s.status === 'needs-draw') return `Needs a draw (${[...new Set((s.draws ?? []).map((d) => NAMES[d.table]))].join(', ')})`;
    return `Waiting for ${s.waitingFor ?? (stage === 'cross' ? 'Rounds 1–3' : 'Rounds 4–5')}`;
}
