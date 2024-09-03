'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'fiat_balance', {
      type: Sequelize.STRING,
      defaultValue: '0',
      allowNull: false,
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('accounts', 'fiat_balance');
  },
};
