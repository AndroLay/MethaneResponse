"""Aggregate actual repeated agent runs; never count sessions as people."""
from collections import Counter, defaultdict
from datetime import datetime
import json
from pathlib import Path
from statistics import median

PACKET = Path(__file__).resolve().parent


def read(name):
    return json.loads((PACKET / name).read_text())


def main():
    freeze = read('p5-freeze.json')
    assignments = {a['session']: a for a in freeze['assignments']}
    score_rows = read('p5-scoring.json')
    scores = {(r['sessionId'], r['workflow'], r['taskId']): r for r in score_rows}
    if len(scores) != len(score_rows):
        raise ValueError('Duplicate scoring rows')
    tasks, exits, actual_agents, seen, findings = [], {}, set(), set(), []
    for number in (1, 2):
        data = read(f'p5-agent-{number}.json')
        if data['agentId'] != f'agent{number}':
            raise ValueError('Wrong agent identity')
        actual_agents.add(data['agentId'])
        for session in data['sessionResults']:
            sid = session['sessionId']
            assignment = assignments[sid]
            if assignment['agent'] != number or sid in exits:
                raise ValueError('Wrong/duplicate session assignment')
            if session['order'] != assignment['order']:
                raise ValueError('Workflow order drift')
            exits[sid] = session['physicalProofBeliefs']
            if set(exits[sid]) != {'feedback', 'missingObservations', 'scoreOrHash'} or any(type(v) is not bool for v in exits[sid].values()):
                raise ValueError('Invalid exit beliefs')
            findings.extend({'sessionId': sid, 'finding': f} for f in session.get('findings', []))
            expected_cases = dict(condition.split(':', 1) for condition in assignment['order'])
            for task in session['tasks']:
                workflow, tid = task['workflow'], task['taskId']
                key = sid, workflow, tid
                if key in seen or tid not in {'T1', 'T2', 'T3', 'T4'} or task['caseId'] != expected_cases[workflow]:
                    raise ValueError('Unexpected/duplicate task')
                seen.add(key)
                seconds = task.get('elapsedSeconds')
                if type(task['completed']) is not bool:
                    raise ValueError('Invalid completion flag')
                if seconds is not None and (type(seconds) not in (float, int) or not 0 <= seconds <= 86400):
                    raise ValueError('Invalid observed duration')
                if task.get('startedAt') and task.get('endedAt'):
                    start, end = (datetime.fromisoformat(task[k].replace('Z', '+00:00')) for k in ('startedAt', 'endedAt'))
                    if start.tzinfo is None or end.tzinfo is None or end < start:
                        raise ValueError('Invalid observed timestamps')
                    if seconds is not None and abs((end - start).total_seconds() - seconds) > 0.001:
                        raise ValueError('Duration does not match observed timestamps')
                if task['assistance'] not in {'none', 'repeat_prompt', 'navigation_hint', 'substantive_hint'}:
                    raise ValueError('Unknown assistance')
                score = scores[key]
                if score['correctness'] not in {'correct', 'partly_correct', 'incorrect', 'abstained'} or type(score['criticalMisunderstanding']) is not bool:
                    raise ValueError('Invalid score')
                tasks.append({**task, **score})
    expected = {(sid, workflow, tid) for sid in assignments for workflow in ('manual', 'app') for tid in ('T1', 'T2', 'T3', 'T4')}
    missing = sorted(expected - seen)
    if set(scores) != seen:
        raise ValueError('Scoring rows must match observed tasks exactly')
    metrics = {}
    grouped = defaultdict(list)
    for task in tasks:
        grouped[task['workflow'], task['taskId']].append(task)
    for workflow in ('manual', 'app'):
        metrics[workflow] = {}
        for tid in ('T1', 'T2', 'T3', 'T4'):
            rows = grouped[workflow, tid]
            times = [r['elapsedSeconds'] for r in rows if r.get('elapsedSeconds') is not None]
            metrics[workflow][tid] = {'scheduled': 6, 'recorded': len(rows),
                'completed': sum(r['completed'] is True for r in rows),
                'correctWithoutSubstantiveHelp': sum(r['completed'] and r['correctness'] == 'correct' and r['assistance'] != 'substantive_hint' and not r['criticalMisunderstanding'] for r in rows),
                'correctness': dict(Counter(r['correctness'] for r in rows)),
                'assistance': dict(Counter(r['assistance'] for r in rows)),
                'observedWallSeconds': {'count': len(times), 'median': median(times) if times else None, 'min': min(times) if times else None, 'max': max(times) if times else None}}
    paired = []
    by_task = {(r['sessionId'], r['workflow'], r['taskId']): r for r in tasks}
    for sid in assignments:
        for tid in ('T1', 'T2', 'T3', 'T4'):
            manual, app = (by_task.get((sid, workflow, tid)) for workflow in ('manual', 'app'))
            delta = None
            if manual and app and all(r['completed'] and r['correctness'] == 'correct' and r['assistance'] != 'substantive_hint' and not r['criticalMisunderstanding'] and r.get('elapsedSeconds') is not None for r in (manual, app)):
                delta = manual['elapsedSeconds'] - app['elapsedSeconds']
            paired.append({'sessionId': sid, 'taskId': tid, 'manualMinusAppWallSeconds': delta})
    deltas = [p['manualMinusAppWallSeconds'] for p in paired if p['manualMinusAppWallSeconds'] is not None]
    result = {'schemaVersion': 1, 'actualAgentCount': len(actual_agents), 'repeatedSessionCount': len(exits),
              'humanParticipantCount': 0, 'scheduledTasks': 48, 'recordedTasks': len(tasks), 'missingTasks': missing,
              'metrics': metrics, 'pairedTasks': paired, 'pairedObservedCount': len(deltas),
              'pairedManualMinusAppWallSecondsMedian': median(deltas) if deltas else None,
              'exitCriticalBeliefCount': sum(any(v.values()) for v in exits.values()),
              'duringTaskCriticalMisunderstandingCount': sum(r['criticalMisunderstanding'] for r in tasks),
              'findings': findings, 'executionComplete': not missing and len(exits) == 6,
              'humanResearchGatePassed': False, 'publicReleaseApproved': False,
              'limitations': ['Two agents perform six repeated sessions; sessions are not six independent participants.',
                             'Order is counterbalanced across sessions, but agents retain prior task/case knowledge and repeat their assigned order.',
                             'Task elapsed wall time includes tool/model latency and prior-task information reuse; it is not human task time.',
                             'The manual source packet is curated metadata, and a verifier export is supplied; this is not native MARS portal usability.',
                             'Both cases are visible in the manual packet; cross-case exposure and facilitator hints are retained as protocol deviations.',
                             'Correctness is judged by the project agent using a frozen answer key, not by independent human assessors.',
                             'Confidence was not imputed, and missing durations are not zero.']}
    with (PACKET / 'p5-analysis.json').open('x') as out:
        out.write(json.dumps(result, indent=2) + '\n')
    print(json.dumps({k: result[k] for k in ('actualAgentCount', 'repeatedSessionCount', 'recordedTasks', 'executionComplete', 'humanResearchGatePassed')}))


if __name__ == '__main__':
    main()
