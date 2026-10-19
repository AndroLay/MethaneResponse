"""Offline, private analysis of frozen paired tasks; agents never count as humans.

No names, quotes, contact details, or free-text responses are accepted here.
Retain consent and qualitative notes separately. This tool cannot authenticate
participants, consent, independence, timing, or the correctness assigned by a facilitator.
"""
from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime
import hashlib
import json
import math
from pathlib import Path
import re
from statistics import median

from annotator_agreement import _resolve_private_input, write_private_report

TASKS = ('T1', 'T2', 'T3', 'T4')
WORKFLOWS = ('manual', 'app')
ASSISTANCE = ('none', 'repeat_prompt', 'navigation_hint', 'substantive_hint')
CORRECTNESS = ('correct', 'partly_correct', 'incorrect', 'abstained')
BELIEFS = {'feedback', 'missingObservations', 'scoreOrHash'}
HASH = re.compile(r'^[a-f0-9]{64}$')
CODE = re.compile(r'^[AP][0-9]{2}$')


def study_digest(study: dict) -> str:
    return hashlib.sha256(json.dumps(study, sort_keys=True, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode()).hexdigest()


def _keys(value: object, required: set[str], label: str) -> dict:
    if not isinstance(value, dict) or set(value) != required:
        raise ValueError(f'Unexpected or missing {label} fields')
    return value


def _summary(values: list[float]) -> dict | None:
    return {'count': len(values), 'median': median(values), 'min': min(values), 'max': max(values)} if values else None


def validate_study(study: dict) -> dict:
    _keys(study, {'schemaVersion', 'studyId', 'participantKind', 'frozenAt', 'sourceArchiveSha256',
                  'snapshotSha256', 'materialsSha256', 'caseIds', 'taskIds', 'assignments'}, 'study')
    if study['schemaVersion'] != 1 or study['participantKind'] not in ('human', 'agent'):
        raise ValueError('Unsupported study version or participantKind')
    if not isinstance(study['studyId'], str) or not re.fullmatch(r'[a-zA-Z0-9_-]{1,80}', study['studyId']):
        raise ValueError('Invalid studyId')
    try:
        frozen = datetime.fromisoformat(study['frozenAt'].replace('Z', '+00:00'))
        if frozen.tzinfo is None:
            raise ValueError('timezone missing')
    except (TypeError, ValueError, AttributeError) as exc:
        raise ValueError('frozenAt requires a timestamp with timezone') from exc
    for key in ('sourceArchiveSha256', 'snapshotSha256', 'materialsSha256'):
        if not isinstance(study[key], str) or not HASH.fullmatch(study[key]):
            raise ValueError(f'Invalid {key}')
    cases = study['caseIds']
    if not isinstance(cases, list) or len(cases) != 2 or any(not isinstance(c, str) or not c.strip() for c in cases) or len(set(cases)) != 2:
        raise ValueError('Exactly two distinct matched caseIds are required')
    if study['taskIds'] != list(TASKS):
        raise ValueError('All T1-T4 taskIds are required')
    assignments = study['assignments']
    if not isinstance(assignments, list) or not 1 <= len(assignments) <= 8:
        raise ValueError('Freeze 1-8 assignments; the human gate separately requires 5-8')
    by_code = {}
    for assignment in assignments:
        _keys(assignment, {'participantCode', 'workflowOrder', 'caseOrder'}, 'assignment')
        code = assignment['participantCode']
        if not isinstance(code, str) or not CODE.fullmatch(code) or code in by_code:
            raise ValueError('Duplicate or malformed anonymous participantCode')
        if assignment['workflowOrder'] not in (['manual', 'app'], ['app', 'manual']):
            raise ValueError('workflowOrder must contain manual and app once')
        if assignment['caseOrder'] not in (cases, list(reversed(cases))):
            raise ValueError('caseOrder must contain both matched cases')
        by_code[code] = dict(zip(assignment['workflowOrder'], assignment['caseOrder']))
    if study['participantKind'] == 'human':
        for field in ('workflowOrder', 'caseOrder'):
            counts = Counter(tuple(a[field]) for a in assignments)
            if len(counts) != 2 or abs(max(counts.values()) - min(counts.values())) > 1:
                raise ValueError(f'Human {field} must be counterbalanced')
        # Each case must appear in both workflows; otherwise workflow and case are confounded.
        combinations = {(workflow, case_id) for a in assignments for workflow, case_id in zip(a['workflowOrder'], a['caseOrder'])}
        if len(combinations) != 4:
            raise ValueError('Case and workflow assignments must be counterbalanced independently')
        cells = Counter((workflow, case_id) for a in assignments for workflow, case_id in zip(a['workflowOrder'], a['caseOrder']))
        if max(cells.values()) - min(cells.values()) > 1:
            raise ValueError('Workflow/case cell counts must differ by at most one')
    return by_code


def analyze_pilot(study: dict, rows: list[dict], exits: list[dict]) -> dict:
    assignments = validate_study(study)
    digest = study_digest(study)
    by_task = {}
    critical = 0
    for row in rows:
        _keys(row, {'studySha256', 'participantCode', 'workflow', 'caseId', 'taskId', 'elapsedSeconds',
                    'completed', 'assistance', 'correctness', 'criticalMisunderstanding', 'confidence'}, 'task')
        if row['studySha256'] != digest:
            raise ValueError('Task does not match frozen study; analyze changed builds separately')
        code, workflow, task = row['participantCode'], row['workflow'], row['taskId']
        if not isinstance(code, str) or code not in assignments or not isinstance(workflow, str) or workflow not in WORKFLOWS or task not in TASKS:
            raise ValueError('Unknown task assignment')
        if row['caseId'] != assignments[code][workflow]:
            raise ValueError('Task case does not match frozen assignment')
        key = (code, workflow, task)
        if key in by_task:
            raise ValueError('Duplicate task result')
        for field in ('completed', 'criticalMisunderstanding'):
            if type(row[field]) is not bool:
                raise ValueError(f'{field} must be Boolean')
        if row['assistance'] not in ASSISTANCE:
            raise ValueError('Invalid assistance')
        if row['correctness'] not in CORRECTNESS:
            raise ValueError('Invalid correctness')
        seconds = row['elapsedSeconds']
        if seconds is not None and (type(seconds) not in (int, float) or not math.isfinite(seconds) or not 0 <= seconds <= 86400):
            raise ValueError('Invalid elapsedSeconds')
        confidence = row['confidence']
        if confidence is not None and (type(confidence) is not int or not 1 <= confidence <= 5):
            raise ValueError('Invalid confidence')
        critical += int(row['criticalMisunderstanding'])
        by_task[key] = row
    by_exit = {}
    for item in exits:
        _keys(item, {'participantCode', 'physicalProofBeliefs'}, 'exit check')
        code = item['participantCode']
        if not isinstance(code, str) or code not in assignments:
            raise ValueError('Unknown exit assignment')
        if code in by_exit:
            raise ValueError('Duplicate exit check')
        beliefs = _keys(item['physicalProofBeliefs'], BELIEFS, 'exit beliefs')
        if any(type(v) is not bool for v in beliefs.values()):
            raise ValueError('Exit beliefs must be Boolean')
        by_exit[code] = beliefs
    n = len(assignments)
    tasks = {workflow: {} for workflow in WORKFLOWS}
    paired = {}
    for workflow in WORKFLOWS:
        for task in TASKS:
            group = [r for (code, w, t), r in by_task.items() if w == workflow and t == task]
            independently_correct = sum(r['completed'] and r['correctness'] == 'correct' and r['assistance'] != 'substantive_hint' and not r['criticalMisunderstanding'] for r in group)
            tasks[workflow][task] = {
                'scheduled': n, 'recorded': len(group), 'notRecorded': n - len(group),
                'completed': sum(r['completed'] for r in group), 'independentCorrect': independently_correct,
                'assistanceCounts': {value: sum(r['assistance'] == value for r in group) for value in ASSISTANCE},
                'correctnessCounts': {value: sum(r['correctness'] == value for r in group) for value in CORRECTNESS},
                'observedSecondsIncludingIncomplete': _summary([r['elapsedSeconds'] for r in group if r['elapsedSeconds'] is not None]),
                'confidence': _summary([r['confidence'] for r in group if r['confidence'] is not None]),
            }
    for task in TASKS:
        pairs = [(by_task.get((code, 'manual', task)), by_task.get((code, 'app', task))) for code in assignments]
        complete = [(a, b) for a, b in pairs if a and b and all(r['completed'] and r['correctness'] == 'correct' and not r['criticalMisunderstanding'] for r in (a, b))]
        timed = [(a, b) for a, b in complete if all(r['elapsedSeconds'] is not None for r in (a, b))]
        independent_timed = [(a, b) for a, b in timed if all(r['assistance'] != 'substantive_hint' for r in (a, b))]
        paired[task] = {
            'scheduledPairs': n, 'completeCorrectPairs': len(complete), 'incompleteOrIncorrectPairs': n - len(complete),
            'pairsWithSubstantiveHelp': sum(any(r and r['assistance'] == 'substantive_hint' for r in (a, b)) for a, b in pairs),
            'manualMinusAppSeconds': _summary([a['elapsedSeconds'] - b['elapsedSeconds'] for a, b in timed]),
            'manualMinusAppSecondsWithoutSubstantiveHelp': _summary([a['elapsedSeconds'] - b['elapsedSeconds'] for a, b in independent_timed]),
        }
    required = math.ceil(0.8 * n)
    critical_exit = sum(any(b.values()) for b in by_exit.values())
    blockers = []
    if study['participantKind'] != 'human':
        blockers.append('Agent execution does not satisfy the human pilot gate')
    if not 5 <= n <= 8:
        blockers.append('Human pilot requires 5-8 independent relevant participants')
    for task in ('T1', 'T3', 'T4'):
        if tasks['app'][task]['independentCorrect'] < required:
            blockers.append(f'{task}: independent correct completions below {required}/{n}')
    if len(by_task) != n * len(TASKS) * len(WORKFLOWS):
        blockers.append('Some scheduled paired tasks are not recorded')
    if len(by_exit) != n or critical_exit:
        blockers.append('Exit checks are missing or retain physical-proof misconceptions')
    if critical:
        blockers.append('Critical task findings require documented fixes and a separately frozen recheck')
    return {
        'schemaVersion': 1, 'analysis': 'human_formative_pilot' if study['participantKind'] == 'human' else 'agent_assisted_workflow_check',
        'studySha256': digest, 'sourceArchiveSha256': study['sourceArchiveSha256'], 'snapshotSha256': study['snapshotSha256'],
        'scheduledParticipantCount': n,
        'humanParticipantCount': len({key[0] for key in by_task} | set(by_exit)) if study['participantKind'] == 'human' else 0,
        'agentCount': len({key[0] for key in by_task} | set(by_exit)) if study['participantKind'] == 'agent' else 0,
        'recordedTaskCount': len(by_task), 'criticalTaskFindings': critical,
        'exitChecks': {'recorded': len(by_exit), 'notRecorded': n - len(by_exit), 'criticalBeliefCount': critical_exit},
        'tasks': tasks, 'paired': paired, 'pilotGate': {'passed': not blockers, 'blockers': blockers,
            'requiredIndependentCompletionsPerTask': required},
        'publicReleaseApproved': False,
        'limitations': [
            'Facilitator-supplied correctness and participant type are attestations, not independently authenticated facts.',
            'Null timing is unavailable, never zero. Incomplete/incorrect pairs remain in denominators.',
            'Positive manual-minus-app time means faster recorded app execution on these matched tasks only.',
            'Report workflow/case/order/help and case comparability; this small sample does not establish population time savings or climate impact.',
            'Agent timings are tool execution times, not human usability measurements. Human and agent studies must remain separate.',
            'This private aggregate requires a separate consent and disclosure review before publication.',
        ],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--study', required=True, type=Path)
    parser.add_argument('--tasks', required=True, type=Path, help='Minimized task result JSONL')
    parser.add_argument('--exits', required=True, type=Path, help='Exit-check JSONL')
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    paths = [_resolve_private_input(p) for p in (args.study, args.tasks, args.exits)]
    config = json.loads(paths[0].read_text())
    rows, exits = [[json.loads(line) for line in p.read_text().splitlines() if line.strip()] for p in paths[1:]]
    report = analyze_pilot(config, rows, exits)
    report['inputSha256'] = {name: hashlib.sha256(p.read_bytes()).hexdigest() for name, p in zip(('study', 'tasks', 'exits'), paths)}
    write_private_report(args.output, report)
    print(json.dumps({'reportWritten': True, 'recordedTaskCount': report['recordedTaskCount'], 'humanPilotGatePassed': report['pilotGate']['passed']}))


if __name__ == '__main__':
    main()
