CREATE TABLE "SHOP_TAI_KHOAN" (
 "id" TEXT NOT NULL, "username" TEXT NOT NULL, "email" TEXT, "phone" TEXT,
 "passwordHash" TEXT NOT NULL, "name" TEXT NOT NULL, "gender" TEXT NOT NULL DEFAULT '', "birthday" TEXT NOT NULL DEFAULT '',
 "addresses" JSONB NOT NULL DEFAULT '[]', "balance" INTEGER NOT NULL DEFAULT 6000000,
 "sessionVersion" INTEGER NOT NULL DEFAULT 1, "active" BOOLEAN NOT NULL DEFAULT true,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SHOP_TAI_KHOAN_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "shop_balance_nonnegative" CHECK ("balance" >= 0)
);
CREATE UNIQUE INDEX "SHOP_TAI_KHOAN_username_key" ON "SHOP_TAI_KHOAN"("username");
CREATE UNIQUE INDEX "SHOP_TAI_KHOAN_email_key" ON "SHOP_TAI_KHOAN"("email");
CREATE UNIQUE INDEX "SHOP_TAI_KHOAN_phone_key" ON "SHOP_TAI_KHOAN"("phone");
CREATE TABLE "SHOP_SO_VI" (
 "id" TEXT NOT NULL, "accountId" TEXT NOT NULL, "key" TEXT NOT NULL, "kind" TEXT NOT NULL,
 "amount" INTEGER NOT NULL, "orderId" TEXT, "note" TEXT NOT NULL,
 "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SHOP_SO_VI_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "SHOP_SO_VI_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SHOP_TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "shop_wallet_kind_amount" CHECK (("kind"='OPEN' AND "amount"=6000000 AND "orderId" IS NULL) OR ("kind"='PAY' AND "amount"<0 AND "orderId" IS NOT NULL) OR ("kind"='REFUND' AND "amount">0 AND "orderId" IS NOT NULL))
);
CREATE UNIQUE INDEX "SHOP_SO_VI_key_key" ON "SHOP_SO_VI"("key");
CREATE UNIQUE INDEX "shop_wallet_open_once" ON "SHOP_SO_VI"("accountId") WHERE "kind"='OPEN';
CREATE INDEX "SHOP_SO_VI_accountId_createdAt_idx" ON "SHOP_SO_VI"("accountId","createdAt");
CREATE TABLE "SHOP_DON_MUA" (
 "orderId" TEXT NOT NULL, "accountId" TEXT NOT NULL, "payment" TEXT NOT NULL, "charged" INTEGER NOT NULL,
 "refunded" INTEGER NOT NULL DEFAULT 0, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "SHOP_DON_MUA_pkey" PRIMARY KEY ("orderId"),
 CONSTRAINT "SHOP_DON_MUA_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "SHOP_TAI_KHOAN"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "SHOP_DON_MUA_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DON_HANG"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "shop_purchase_payment" CHECK ("payment" IN ('cod','wallet','bank')),
 CONSTRAINT "shop_purchase_amounts" CHECK ("charged">0 AND "refunded">=0 AND "refunded"<="charged")
);
CREATE INDEX "SHOP_DON_MUA_accountId_createdAt_idx" ON "SHOP_DON_MUA"("accountId","createdAt");
