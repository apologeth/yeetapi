'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('accounts', 'fiat_wallet_id', {
      type: Sequelize.STRING,
    });
  },
};
