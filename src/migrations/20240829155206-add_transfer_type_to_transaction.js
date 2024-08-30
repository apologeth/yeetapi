'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('transactions', 'transfer_type', {
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
