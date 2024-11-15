'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('transactions', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
      },
      sender: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      receiver: {
        type: Sequelize.UUID,
      },
      sent_amount: {
        type: Sequelize.NUMERIC(27, 0),
        allowNull: false,
      },
      received_amount: {
        type: Sequelize.NUMERIC(27, 0),
        allowNull: false,
      },
      sent_token: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      received_token: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      transaction_hash: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },
      payment_code: {
        type: Sequelize.STRING,
        unique: true,
        allowNull: true,
      },
      product_code: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      customer_id: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      type: {
        type: Sequelize.ENUM(
          'BUY_TOKEN',
          'BUY_PRODUCT',
          'TRANSFER',
          'WITHDRAW',
        ),
        allowNull: false,
      },
      transfer_type: {
        type: Sequelize.ENUM(
          'CRYPTO_TO_CRYPTO',
          'NATIVE_TO_NATIVE',
          'CRYPTO_TO_FIAT',
          'NATIVE_TO_FIAT',
          'FIAT_TO_CRYPTO',
        ),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM('INIT', 'SENDING', 'SENT', 'FAILED'),
        allowNull: false,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updated_at: {
        type: Sequelize.DATE,
      },
    });

    await queryInterface.addConstraint('transactions', {
      fields: ['sender'],
      type: 'foreign key',
      name: 'fk_transactions_sender',
      references: {
        table: 'accounts',
        field: 'id',
      },
    });

    await queryInterface.addConstraint('transactions', {
      fields: ['receiver'],
      type: 'foreign key',
      name: 'fk_transactions_receiver',
      references: {
        table: 'accounts',
        field: 'id',
      },
    });

    await queryInterface.addConstraint('transactions', {
      fields: ['sent_token'],
      type: 'foreign key',
      name: 'fk_transactions_sent_token',
      references: {
        table: 'tokens',
        field: 'id',
      },
    });

    await queryInterface.addConstraint('transactions', {
      fields: ['received_token'],
      type: 'foreign key',
      name: 'fk_transactions_received_token',
      references: {
        table: 'tokens',
        field: 'id',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'transactions',
      'fk_transactions_sender',
    );
    await queryInterface.removeConstraint(
      'transactions',
      'fk_transactions_receiver',
    );
    await queryInterface.removeConstraint(
      'transactions',
      'fk_transactions_sent_token',
    );
    await queryInterface.removeConstraint(
      'transactions',
      'fk_transactions_received_token',
    );
    await queryInterface.dropTable('transactions');
  },
};
