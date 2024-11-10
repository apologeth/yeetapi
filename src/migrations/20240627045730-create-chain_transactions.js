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
      hash: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      signature: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true,
      },
      action_type: {
        type: Sequelize.ENUM('DEPLOY_AA', 'AA_TRANSFER', 'EOA_TRANSFER'),
      },
      status: {
        type: Sequelize.ENUM('INIT', 'SUBMITTED', 'CONFIRMED', 'FAILED'),
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
