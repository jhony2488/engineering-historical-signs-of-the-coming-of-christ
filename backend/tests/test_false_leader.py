from motor.domain.false_leader import detect_false_leader


def test_false_leader_alert_triggered():
    alert = detect_false_leader(0.85, 0.80, threshold=0.7)
    assert alert.alerta is True
    assert alert.score_incongruencia > 0


def test_false_leader_no_alert():
    alert = detect_false_leader(0.3, 0.4, threshold=0.7)
    assert alert.alerta is False


def test_false_leader_at_threshold_boundary():
    alert = detect_false_leader(0.7, 0.7, threshold=0.7)
    assert alert.alerta is True


def test_false_leader_high_incongruence_when_both_high():
    alert = detect_false_leader(0.85, 0.80, threshold=0.7)
    assert alert.alerta is True
    assert alert.score_incongruencia > 0.5
