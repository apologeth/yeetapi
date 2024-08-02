'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('chain_transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      transaction_hash: {
        type: Sequelize.STRING,
        unique: true,
      },
      action_type: {
        type: Sequelize.ENUM('DEPLOY_AA'),
      },
      status: {
        type: Sequelize.ENUM('SUBMITTED', 'CONFIRMED', 'FAILED'),
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('chain_transactions');
  },
};
