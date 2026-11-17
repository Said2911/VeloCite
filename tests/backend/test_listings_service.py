from backend.services.listings import parse_uuid, percentile_of


def test_parse_uuid():
    assert parse_uuid("not-a-uuid") is None
    assert parse_uuid("00000000-0000-0000-0000-000000000001") == "00000000-0000-0000-0000-000000000001"


def test_percentile_of():
    values = [100, 200, 300, 400, 500]
    assert percentile_of(100, values) == 20.0
    assert percentile_of(500, values) == 100.0
    assert percentile_of(250, values[:4]) is None   # too few comparables
    assert percentile_of(None, values) is None
