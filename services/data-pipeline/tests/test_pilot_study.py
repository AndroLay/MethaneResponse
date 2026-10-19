"""All sessions below are disposable software fixtures, never participant results."""
from copy import deepcopy
import hashlib
import json
from pathlib import Path
import sys

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pilot_study import analyze_pilot, study_digest, main


def study(kind='human'):
    return {
        'schemaVersion': 1, 'studyId': 'pilot-test-fixture', 'participantKind': kind,
        'frozenAt': '2026-10-18T04:00:00Z', 'sourceArchiveSha256': 'a' * 64,
        'snapshotSha256': 'b' * 64, 'materialsSha256': 'c' * 64,
        'caseIds': ['case-a', 'case-b'], 'taskIds': ['T1', 'T2', 'T3', 'T4'],
        'assignments': [
            {'participantCode': f'P{i + 1:02}', 'workflowOrder': ['manual', 'app'] if i % 2 == 0 else ['app', 'manual'],
             'caseOrder': ['case-a', 'case-b'] if (i // 2) % 2 == 0 else ['case-b', 'case-a']}
            for i in range(5)
        ],
    }


def inputs(config):
    rows = []
    exits = []
    for assignment in config['assignments']:
        code = assignment['participantCode']
        exits.append({'participantCode': code, 'physicalProofBeliefs': {
            'feedback': False, 'missingObservations': False, 'scoreOrHash': False}})
        for workflow, case_id in zip(assignment['workflowOrder'], assignment['caseOrder']):
            for task in config['taskIds']:
                rows.append({'studySha256': study_digest(config), 'participantCode': code,
                             'workflow': workflow, 'caseId': case_id, 'taskId': task,
                             'elapsedSeconds': 60 if workflow == 'manual' else 30,
                             'completed': True, 'assistance': 'none', 'correctness': 'correct',
                             'criticalMisunderstanding': False, 'confidence': None})
    return rows, exits


def test_gate_and_paired_analysis_include_all_frozen_assignments():
    config = study()
    rows, exits = inputs(config)
    report = analyze_pilot(config, rows, exits)
    assert report['pilotGate']['passed']
    assert report['pilotGate']['requiredIndependentCompletionsPerTask'] == 4
    assert report['tasks']['app']['T1']['independentCorrect'] == 5
    assert report['paired']['T1']['manualMinusAppSeconds']['median'] == 30
    assert report['paired']['T1']['completeCorrectPairs'] == 5
    assert report['publicReleaseApproved'] is False


def test_missing_rows_remain_in_denominator_and_are_never_zero_time():
    config = study()
    rows, exits = inputs(config)
    rows = [r for r in rows if not (r['workflow'] == 'app' and r['taskId'] == 'T1' and r['participantCode'] in {'P01', 'P02'})]
    report = analyze_pilot(config, rows, exits)
    assert not report['pilotGate']['passed']
    assert report['tasks']['app']['T1']['scheduled'] == 5
    assert report['tasks']['app']['T1']['notRecorded'] == 2
    assert report['paired']['T1']['completeCorrectPairs'] == 3
    assert report['paired']['T1']['incompleteOrIncorrectPairs'] == 2


def test_incorrect_and_substantively_helped_completions_do_not_pass_gate():
    config = study()
    rows, exits = inputs(config)
    for row in rows:
        if row['workflow'] == 'app' and row['taskId'] == 'T3':
            row['assistance'] = 'substantive_hint' if row['participantCode'] == 'P01' else 'none'
            if row['participantCode'] == 'P02':
                row['correctness'] = 'incorrect'
    report = analyze_pilot(config, rows, exits)
    assert not report['pilotGate']['passed']
    assert report['tasks']['app']['T3']['independentCorrect'] == 3
    assert report['paired']['T3']['completeCorrectPairs'] == 4
    assert report['paired']['T3']['pairsWithSubstantiveHelp'] == 1


def test_exit_belief_and_missing_exit_fail_closed_even_if_tasks_pass():
    config = study()
    rows, exits = inputs(config)
    exits[0]['physicalProofBeliefs']['feedback'] = True
    report = analyze_pilot(config, rows, exits)
    assert not report['pilotGate']['passed']
    assert report['exitChecks']['criticalBeliefCount'] == 1
    assert not analyze_pilot(config, rows, exits[:-1])['pilotGate']['passed']


def test_critical_during_task_requires_closure_even_if_exit_is_correct():
    config = study()
    rows, exits = inputs(config)
    rows[0]['criticalMisunderstanding'] = True
    report = analyze_pilot(config, rows, exits)
    assert not report['pilotGate']['passed']
    assert report['criticalTaskFindings'] == 1


@pytest.mark.parametrize('mutation,error', [
    (lambda r: r.update(studySha256='d' * 64), 'frozen study'),
    (lambda r: r.update(caseId='other'), 'assignment'),
    (lambda r: r.update(elapsedSeconds=-1), 'elapsedSeconds'),
    (lambda r: r.update(elapsedSeconds=float('nan')), 'elapsedSeconds'),
    (lambda r: r.update(completed='yes'), 'completed'),
    (lambda r: r.update(assistance='unknown'), 'assistance'),
    (lambda r: r.update(anonymousNote='Sensitive raw response'), 'Unexpected'),
])
def test_rejects_drift_malformed_values_and_unnecessary_raw_notes(mutation, error):
    config = study()
    rows, exits = inputs(config)
    mutation(rows[0])
    with pytest.raises(ValueError, match=error):
        analyze_pilot(config, rows, exits)


def test_duplicate_rows_or_exits_are_rejected():
    config = study()
    rows, exits = inputs(config)
    with pytest.raises(ValueError, match='Duplicate task'):
        analyze_pilot(config, rows + [deepcopy(rows[0])], exits)
    with pytest.raises(ValueError, match='Duplicate exit'):
        analyze_pilot(config, rows, exits + [deepcopy(exits[0])])


def test_agent_sessions_never_pass_human_gate_even_with_perfect_synthetic_answers():
    config = study('agent')
    rows, exits = inputs(config)
    report = analyze_pilot(config, rows, exits)
    assert report['analysis'] == 'agent_assisted_workflow_check'
    assert report['humanParticipantCount'] == 0
    assert not report['pilotGate']['passed']
    assert 'agent' in ' '.join(report['pilotGate']['blockers']).lower()


def test_empty_study_has_zero_results_and_no_success_claim():
    config = study('agent')
    report = analyze_pilot(config, [], [])
    assert report['recordedTaskCount'] == 0
    assert not report['pilotGate']['passed']
    assert report['paired']['T1']['manualMinusAppSeconds'] is None
    assert analyze_pilot(study(), [], [])['humanParticipantCount'] == 0


def test_rejects_uncounterbalanced_order_and_missing_study_binding():
    config = study()
    config['snapshotSha256'] = 'invalid'
    with pytest.raises(ValueError, match='snapshotSha256'):
        analyze_pilot(config, [], [])
    config = study()
    for assignment in config['assignments']:
        assignment['workflowOrder'] = ['app', 'manual']
    with pytest.raises(ValueError, match='counterbalanced'):
        analyze_pilot(config, [], [])


def test_rejects_balanced_marginals_with_uneven_workflow_case_cells():
    config = study()
    config['assignments'] = [
        {'participantCode': f'P{i+1:02}', 'workflowOrder': ['manual', 'app'] if i < 4 else ['app', 'manual'],
         'caseOrder': ['case-a', 'case-b'] if i < 3 or i == 4 else ['case-b', 'case-a']}
        for i in range(8)
    ]
    with pytest.raises(ValueError, match='cell'):
        analyze_pilot(config, [], [])


def test_digest_ignores_object_key_order_but_binds_build_and_materials():
    config = study()
    digest = study_digest(config)
    assert digest == study_digest(dict(reversed(list(config.items()))))
    config['materialsSha256'] = 'd' * 64
    assert study_digest(config) != digest


def test_cli_writes_private_report_refuses_overwrite_and_only_emits_counts(tmp_path, monkeypatch, capsys):
    config = study('agent')
    rows, exits = inputs(config)
    for name, payload in [('study.json', json.dumps(config)), ('tasks.jsonl', '\n'.join(json.dumps(r) for r in rows)),
                          ('exits.jsonl', '\n'.join(json.dumps(r) for r in exits))]:
        (tmp_path / name).write_text(payload)
        (tmp_path / name).chmod(0o600)
    monkeypatch.setattr(sys, 'argv', ['pilot_study.py', '--study', str(tmp_path / 'study.json'),
        '--tasks', str(tmp_path / 'tasks.jsonl'), '--exits', str(tmp_path / 'exits.jsonl'), '--output', str(tmp_path / 'report.json')])
    main()
    assert json.loads(capsys.readouterr().out) == {'reportWritten': True, 'recordedTaskCount': 40, 'humanPilotGatePassed': False}
    assert (tmp_path / 'report.json').stat().st_mode & 0o777 == 0o600
    with pytest.raises(ValueError, match='overwrite'):
        main()
