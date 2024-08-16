'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('accounts', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        unique: true,
      },
      account_abstraction_address: {
        type: Sequelize.STRING,
      },
      user_operation_hash: {
        type: Sequelize.STRING,
        unique: true,
      },
      encrypted_shard: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM('INIT', 'CREATED', 'FAILED'),
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
    await queryInterface.dropTable('accounts');
  },
};