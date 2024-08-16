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
      },
      receiver: {
        type: Sequelize.UUID,
      },
      sent_amount: {
        type: Sequelize.STRING,
      },
      received_amount: {
        type: Sequelize.STRING,
      },
      sent_token: {
        type: Sequelize.UUID,
      },
      received_token: {
        type: Sequelize.UUID,
      },
      status: {
        type: Sequelize.ENUM('INIT', 'SENDING', 'SENT', 'FAILED'),
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
