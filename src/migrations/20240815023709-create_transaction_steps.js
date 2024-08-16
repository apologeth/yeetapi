'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transaction_steps', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      transaction_id: {
        type: Sequelize.UUID,
      },
      external_id: {
        type: Sequelize.STRING,
        unique: true,
      },
      type: {
        type: Sequelize.ENUM('CHAIN_TRANSACTION'),
      },
      status: {
        type: Sequelize.ENUM('INIT', 'PROCESSING', 'SUCCESS', 'FAILED'),
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

    await queryInterface.addConstraint('transaction_steps', {
      fields: ['transaction_id'],
      type: 'foreign key',
      name: 'fk_transaction_steps',
      references: {
        table: 'transactions',
        field: 'id',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'transaction_steps',
      'fk_transaction_steps',
    );
    await queryInterface.dropTable('transaction_steps');
  },
};
