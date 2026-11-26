-- Distinguish simulated wallet credit from actual bank transfers in OMS receipts.
ALTER TYPE "TransactionSource" ADD VALUE 'VI_MO_PHONG';
