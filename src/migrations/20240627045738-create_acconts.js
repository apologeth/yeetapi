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
      },
      password: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      address: {
        type: Sequelize.STRING,
        unique: true,
      },
      // Fiat wallet must be unique,
      // but for testing purpose we only use one fiat wallet id
      // for all accounts
      fiat_wallet_id: {
        type: Sequelize.STRING,
      },
      account_abstraction_address: {
        type: Sequelize.STRING,
      },
      chain_transaction_id: {
        type: Sequelize.UUID,
      },
      encrypted_shard: {
        type: Sequelize.TEXT,
      },
      status: {
        type: Sequelize.ENUM('INIT', 'CREATING', 'CREATED', 'FAILED'),
        defaultValue: 'INIT',
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

    await queryInterface.addIndex('accounts', ['email']);
    await queryInterface.addIndex('accounts', ['address']);
    await queryInterface.addIndex('accounts', ['account_abstraction_address']);
    await queryInterface.addConstraint('accounts', {
      fields: ['chain_transaction_id'],
      type: 'foreign key',
      name: 'fk_user_chain_transaction_id',
      references: {
        table: 'chain_transactions',
        field: 'id',
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('accounts', ['email']);
    await queryInterface.removeIndex('accounts', ['address']);
    await queryInterface.removeIndex('accounts', [
      'account_abstraction_address',
    ]);
    await queryInterface.dropTable('accounts');
  },
};
