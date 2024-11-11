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
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM(
          'AA_CHAIN_TRANSACTION',
          'EOA_CHAIN_TRANSACTION',
          'WALLET_TRANSFER',
          'WALLET_PAYMENT',
        ),
      },
      sender: {
        type: Sequelize.STRING,
      },
      receiver: {
        type: Sequelize.STRING,
      },
      token_address: {
        type: Sequelize.STRING,
      },
      token_amount: {
        type: Sequelize.NUMERIC(27, 0),
      },
      fiat_amount: {
        type: Sequelize.NUMERIC(27, 0),
      },
      priority: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      status: {
        type: Sequelize.ENUM(
          'INIT',
          'PROCESSING',
          'SUCCESS',
          'REVERTED',
          'FAILED',
        ),
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
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
