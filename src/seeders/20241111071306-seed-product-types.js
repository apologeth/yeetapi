'use strict';
const { v4: uuidv4 } = require('uuid');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert(
      'product_types',
      [
        {
          id: uuidv4(),
          name: 'pulsa',
          operators: JSON.stringify([
            'axis',
            'indosat',
            'smart',
            'telkomsel',
            'three',
            'xl',
            'by.U',
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          name: 'data',
          operators: JSON.stringify([
            'axis_paket_internet',
            'telkomsel',
            'indosat_paket_internet',
            'smartfren_paket_internet',
            'tri_paket_internet',
            'telkomsel_paket_internet',
            'xl_paket_internet',
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          name: 'etoll',
          operators: JSON.stringify([
            'dana',
            'mandiri_e-toll',
            'indomaret_card_e-money',
            'gopay_e-money',
            'linkaja',
            'ovo',
            'shopee_pay',
            'tix_id',
          ]),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          name: 'game',
          operators: JSON.stringify(['arena_of_valor', 'free_fire', 'garena']),
          created_at: new Date(),
          updated_at: new Date(),
        },
        {
          id: uuidv4(),
          name: 'pln',
          operators: JSON.stringify(['pln']),
          created_at: new Date(),
          updated_at: new Date(),
        },
      ],
      {},
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('product_types', null, {});
  },
};
