'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('transactions', 'type', {
      type: Sequelize.ENUM('TRANSFER', 'BUY_TOKEN'),
      defaultValue: 'TRANSFER',
      allowNull: false,
    });
    await queryInterface.addColumn('transactions', 'payment_code', {
      type: Sequelize.STRING,
    });
    await queryInterface.changeColumn('transactions', 'transfer_type', {
      type: Sequelize.ENUM(
        'CRYPTO_TO_CRYPTO',
        'NATIVE_TO_NATIVE',
        'CRYPTO_TO_FIAT',
        'FIAT_TO_CRYPTO',
      ),
      allowNull: true,
    });
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_transaction_steps_type"
      ADD VALUE 'BUY_TOKEN'
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_transaction_steps_type"
      ADD VALUE 'ADMIN_CHAIN_TRANSACTION'
    `);
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('transactions', 'type');
    await queryInterface.removeColumn('transactions', 'payment_ccode');
    await queryInterface.changeColumn('transactions', 'transfer_type', {
      type: Sequelize.ENUM(
        'CRYPTO_TO_CRYPTO',
        'NATIVE_TO_NATIVE',
        'CRYPTO_TO_FIAT',
        'FIAT_TO_CRYPTO',
      ),
      defaultValue: 'CRYPTO_TO_CRYPTO',
      allowNull: false,
    });
  },
};
