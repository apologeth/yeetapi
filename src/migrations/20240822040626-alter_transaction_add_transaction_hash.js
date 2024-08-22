'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('transactions', 'transaction_hash', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true,
    });
  },
};
