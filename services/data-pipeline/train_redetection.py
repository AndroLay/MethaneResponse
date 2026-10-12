"""Optional supervised model trainer, requiring real opportunity-labeled records.

No model or forecast is created without independently supplied source-disjoint,
time-separated satellite observation opportunities. The MARS plume archive alone
DOES NOT contain negative opportunities and cannot satisfy this requirement.
"""
from __future__ import annotations
import argparse
import json
from pathlib import Path

FEATURES = ['prior_detection_count', 'median_flux_kg_hr', 'observed_opportunity_count', 'cloud_free_fraction', 'lookback_days']


def train(input_csv: Path, output_json: Path):
    import pandas as pd
    from sklearn.linear_model import LogisticRegression
    from sklearn.metrics import average_precision_score, brier_score_loss
    from sklearn.pipeline import make_pipeline
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import StandardScaler

    frame = pd.read_csv(input_csv)
    required = {'source_id','snapshot_date','redetected_next_30d',*FEATURES}
    if missing := required - set(frame.columns):
        raise ValueError(f'Missing observation-opportunity fields: {sorted(missing)}')
    if len(frame) < 150 or frame.source_id.nunique() < 15:
        raise ValueError('Insufficient opportunity-labeled data: require >=150 rows and >=15 independent source IDs')
    frame['snapshot_date'] = pd.to_datetime(frame.snapshot_date, utc=True, errors='raise')
    frame['redetected_next_30d'] = pd.to_numeric(frame.redetected_next_30d, errors='raise')
    if not frame.redetected_next_30d.isin([0,1]).all():
        raise ValueError('Outcome must be 0 or 1 and recorded only when an adequate future observation opportunity occurred')
    if (frame.observed_opportunity_count < 1).any() or not frame.cloud_free_fraction.between(0,1).all():
        raise ValueError('All examples require real observation opportunity counts and valid cloud-free fractions')
    # Purge forward label horizon: training latest timestamp must be >=30d before holdout.
    cutoff = frame.snapshot_date.quantile(0.75)
    training = frame.loc[frame.snapshot_date < cutoff - pd.Timedelta(days=30)]
    late = frame.loc[frame.snapshot_date >= cutoff]
    # Avoid same source appearing in train and test, even across time.
    holdout = late.loc[~late.source_id.isin(training.source_id)]
    if len(training) < 50 or len(holdout) < 25 or training.redetected_next_30d.nunique() != 2 or holdout.redetected_next_30d.nunique() != 2:
        raise ValueError('No valid source-disjoint, temporal 30-day-purged test partition; do not publish a forecasting model')
    model = make_pipeline(SimpleImputer(strategy='median'), StandardScaler(), LogisticRegression(max_iter=1000, class_weight=None))
    model.fit(training[FEATURES], training.redetected_next_30d)
    probability = model.predict_proba(holdout[FEATURES])[:,1]
    y = holdout.redetected_next_30d
    baseline = [float(training.redetected_next_30d.mean())] * len(holdout)
    scores = {'average_precision': float(average_precision_score(y, probability)),
              'brier': float(brier_score_loss(y, probability)),
              'baseline_brier': float(brier_score_loss(y, baseline)),
              'test_rows': len(holdout), 'test_sources': int(holdout.source_id.nunique()),
              'train_rows': len(training), 'train_sources': int(training.source_id.nunique())}
    if scores['brier'] >= scores['baseline_brier']:
        raise ValueError('Model does not beat base-rate Brier baseline on source-disjoint temporal holdout')
    # Report evaluation only; never export uncalibrated probabilities as production forecast.
    report = {'status':'research_evaluation_only', 'label':'redetected_on_future_valid_observation_opportunity',
              'trainedModel':True,'forecastEnabled':False,'features':FEATURES,'scores':scores,
              'limitation':'Out-of-time and source-disjoint evaluation; no physical leak probability or repair certification.'}
    output_json.parent.mkdir(parents=True,exist_ok=True)
    output_json.write_text(json.dumps(report,indent=2)+'\n')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('opportunity_labels_csv',type=Path)
    parser.add_argument('--output',type=Path,default=Path('reports/redetection-evaluation.json'))
    args=parser.parse_args()
    print(train(args.opportunity_labels_csv,args.output))
