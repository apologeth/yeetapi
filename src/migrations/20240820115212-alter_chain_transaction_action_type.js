'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_chain_transactions_action_type"
      ADD VALUE 'TRANSFER_TOKEN'
    `);
  },
};
