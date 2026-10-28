const mongoose = require("mongoose");

let transactionsSupported = false;

/**
 * Multi-document transactions require a replica set (or mongos). A plain local
 * `mongod` is standalone, so we detect support once at startup.
 */
async function detectTransactionSupport() {
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionsSupported = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch (err) {
    transactionsSupported = false;
  }
  return transactionsSupported;
}

/**
 * Runs `work(session)` inside a MongoDB transaction when supported.
 * On standalone servers `work(null)` runs directly — every critical write
 * (e.g. the `$expr` seat claim) is still a single atomic document operation,
 * and services apply compensating writes where needed.
 */
async function runInTransaction(work) {
  if (!transactionsSupported) {
    return work(null);
  }

  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  detectTransactionSupport,
  runInTransaction,
  isTransactionSupported: () => transactionsSupported,
};
