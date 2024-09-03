'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_transaction_steps_type"
      ADD VALUE 'EXCHANGE_TO_FIAT'
    `);
    await queryInterface.addColumn('transaction_steps', 'priority', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('transaction_steps', 'sender_address', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('transaction_steps', 'receiver_address', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('transaction_steps', 'token_address', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('transaction_steps', 'token_amount', {
      type: Sequelize.STRING,
    });
    await queryInterface.addColumn('transaction_steps', 'fiat_amount', {
      type: Sequelize.STRING,
    });

    await queryInterface.addIndex('accounts', ['address']);
    await queryInterface.addIndex('accounts', ['account_abstraction_address']);
    await queryInterface.addIndex('tokens', ['address']);
  },
};
