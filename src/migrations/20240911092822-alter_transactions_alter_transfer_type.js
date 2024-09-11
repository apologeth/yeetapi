'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_transactions_transfer_type"
      ADD VALUE 'NATIVE_TO_FIAT'
    `);
  },
};
