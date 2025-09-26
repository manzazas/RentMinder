def compute_flags(data: dict) -> list[str]:
    flags = list(data.get("red_flags") or [])

    rent = data.get("rent") or {}
    deposit = data.get("deposit") or {}
    renewal = data.get("renewal") or {}
    repairs = data.get("repairs") or {}

    if deposit.get("amount") and rent.get("amount"):
        if deposit["amount"] > 1.5 * rent["amount"]:
            flags.append("Deposit unusually high relative to rent (>1.5×).")

    if rent.get("due_day") is not None and rent.get("late_fee_amount") is None:
        flags.append("Ambiguous late fee (no numeric cap).")

    if not (renewal.get("notice_start") and renewal.get("notice_end")):
        flags.append("No renewal notice window specified.")

    if repairs.get("sla_days") is None:
        flags.append("No repair timeline (SLA) specified.")

    # de-dupe while preserving order
    seen, unique = set(), []
    for f in flags:
        if f not in seen:
            unique.append(f); seen.add(f)
    return unique
