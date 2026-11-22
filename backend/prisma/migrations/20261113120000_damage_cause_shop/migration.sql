-- Shop packed the wrong / missing items: a seller fault, not the carrier's (no carrier claim) and not the customer's.
ALTER TYPE "DamageCause" ADD VALUE IF NOT EXISTS 'SHOP_GIAO_SAI';
