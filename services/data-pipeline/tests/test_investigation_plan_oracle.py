import pytest
from investigation_plan_oracle import allocate, day, rank


def test_tied_midrank_and_unknown_flux_are_ranking_points_not_measurements():
    assert rank(10, [1, 10, 10, 100]) == 50
    assert rank(None, [1, 10, 10, 100]) == 0
    assert rank(0, [0]) == 100
    assert day('2026-01-02T00:30:00+02:00') == '2026-01-01'
    with pytest.raises(ValueError):
        day('invalid')


def test_distinct_portfolios_share_capacity_country_quotas_and_eligibility():
    rows = [{'sourceId': name, 'country': country, 'sector': sector, 'medianFluxKgHr': flux,
             'distinctDates': dates, 'observationCount': dates} for name, country, sector, flux, dates in [
        ('DEMO-A', 'A', 'Oil', 1000, 2), ('DEMO-B', 'A', 'Waste', 900, 10),
        ('DEMO-C', 'B', 'Oil', 100, 8), ('DEMO-D', 'C', 'Waste', None, 1)]]
    p = {'capacity': 2, 'maxPerCountry': 1, 'countries': [], 'sectors': [], 'recurrenceWeight': 50}
    assert allocate(rows, p, 'weighted') == ['DEMO-B', 'DEMO-C']
    assert allocate(rows, p, 'flux') == ['DEMO-A', 'DEMO-C']
    assert allocate(rows, {**p, 'countries': ['A']}, 'weighted') == ['DEMO-A']
    assert allocate(rows, {**p, 'sectors': ['Unknown']}, 'breadth') == []
