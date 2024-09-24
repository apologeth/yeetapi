'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.removeConstraint(
      'transactions',
      'fk_transactions_receiver',
    );
    await queryInterface.changeColumn('transactions', 'receiver', {
      type: Sequelize.STRING,
    });
  },
};
