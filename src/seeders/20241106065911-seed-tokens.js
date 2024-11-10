'use strict';

const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert(
      'tokens',
      [
        {
          id: uuidv4(),
          name: 'x0',
          symbol: 'x0',
          decimals: 18,
          address: '0x0',
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          name: 'IDR',
          symbol: 'IDR',
          decimals: 2,
          address: '0x1',
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('tokens', null, {});
  },
};
