'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('transaction_steps', 'external_id', {
      type: Sequelize.STRING,
      unique: true,
      allowNull: true,
    });
  },
};
