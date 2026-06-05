def atualizar_conviccao_bayesiana(
    prior_h: float,
    prob_evidencia_dado_h: float,
    prob_evidencia_dado_nao_h: float,
) -> float:
    """Calcula P(H|E) via Teorema de Bayes."""
    prior_nao_h = 1.0 - prior_h
    prob_marginal_e = prob_evidencia_dado_h * prior_h + prob_evidencia_dado_nao_h * prior_nao_h
    if prob_marginal_e == 0:
        return prior_h
    return (prob_evidencia_dado_h * prior_h) / prob_marginal_e


def update_phase_conviction_sequence(
    prior: float,
    events: list[tuple[float, float]],
) -> float:
    """Atualiza convicção sequencialmente com lista de (P(E|H), P(E|~H))."""
    conviction = prior
    for likelihood_h, likelihood_not_h in events:
        conviction = atualizar_conviccao_bayesiana(conviction, likelihood_h, likelihood_not_h)
    return conviction
